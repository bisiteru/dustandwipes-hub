// Dust & Wipes — WhatsApp inbound webhook (Phase B3).
// Meta Cloud API format. verify_jwt is OFF because Meta cannot send a
// Supabase JWT; authentication is Meta's own verify-token handshake (GET)
// and the WHATSAPP_VERIFY_TOKEN secret. Custom auth per Supabase guidance.
//
// Responsibilities per inbound message:
//   1. find-or-create the dw_conversations thread (phone+channel unique)
//   2. insert the dw_messages row (dedup on wa_message_id)
//   3. bump thread preview/unread
//   4. first message from a new contact → spawn a dw_leads row (source
//      WhatsApp, stage New) so no inquiry sits outside the pipeline
//   5. if the thread has ai_enabled → invoke the ai-responder function
//      fire-and-forget (it answers within seconds)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Meta verification handshake ──────────────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("verification failed", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }

  try {
    const changes = payload?.entry?.flatMap((e: any) => e?.changes || []) || [];
    for (const ch of changes) {
      const value = ch?.value;
      const messages = value?.messages || [];
      const contacts = value?.contacts || [];
      for (const m of messages) {
        const phone = String(m.from || "");
        if (!phone) continue;
        const waId = String(m.id || "");
        const body = m.text?.body
          || m.button?.text
          || m.interactive?.button_reply?.title
          || m.interactive?.list_reply?.title
          || `[${m.type || "unsupported"} message]`;
        const name = String(contacts?.[0]?.profile?.name || "");

        // 1. thread find-or-create
        let { data: cv } = await db.from("dw_conversations").select("*")
          .eq("contact_phone", phone).eq("channel", "whatsapp").maybeSingle();
        let isNewContact = false;
        if (!cv) {
          isNewContact = true;
          const ins = await db.from("dw_conversations").insert({
            id: `cv${Date.now()}_${phone.slice(-4)}`,
            contact_name: name || phone,
            contact_phone: phone,
            channel: "whatsapp",
          }).select().single();
          cv = ins.data;
        }
        if (!cv) continue;

        // 2. message insert (dedup on wa_message_id via unique index)
        const msgId = `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const { error: mErr } = await db.from("dw_messages").insert({
          id: msgId,
          conversation_id: cv.id,
          direction: "in",
          body,
          status: "received",
          sender_name: name || phone,
          wa_message_id: waId,
        });
        if (mErr) {
          // duplicate delivery from Meta — skip quietly
          if (!String(mErr.message).includes("duplicate")) console.error("[wa] msg insert:", mErr.message);
          continue;
        }

        // 3. bump thread
        await db.from("dw_conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body.slice(0, 80),
          unread_count: (cv.unread_count || 0) + 1,
          ...(name && (!cv.contact_name || cv.contact_name === cv.contact_phone) ? { contact_name: name } : {}),
        }).eq("id", cv.id);

        // 4. new contact → pipeline lead (dw_leads uses the jsonb convention)
        if (isNewContact) {
          const now = new Date().toISOString();
          const leadId = `lead${Date.now()}`;
          const lead = {
            id: leadId,
            contactName: name || phone,
            contactPhone: phone,
            contactEmail: "",
            source: "WhatsApp",
            svc: "", loc: "",
            stage: "New", value: 0,
            ownerName: "",
            nextAction: "Respond on WhatsApp",
            nextActionDate: now.slice(0, 10),
            notes: `First message: ${body.slice(0, 200)}`,
            requestId: "",
            stageHistory: [{ stage: "New", at: now, by: "auto (WhatsApp inbound)" }],
            createdAt: now,
          };
          await db.from("dw_leads").insert({ id: leadId, record: lead });
          await db.from("dw_conversations").update({ lead_id: leadId }).eq("id", cv.id);
        }

        // 5. AI auto-response (fire-and-forget)
        if (cv.ai_enabled !== false) {
          fetch(`${SUPABASE_URL}/functions/v1/ai-responder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ conversationId: cv.id }),
          }).catch(() => {});
        }
      }

      // Status callbacks (delivered/read) → update matching outbound rows
      const statuses = value?.statuses || [];
      for (const s of statuses) {
        if (!s?.id || !s?.status) continue;
        await db.from("dw_messages").update({ status: String(s.status) })
          .eq("wa_message_id", String(s.id));
      }
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[wa] webhook error:", e);
    // Always 200 to Meta — retries with backoff otherwise flood the log
    return new Response("ok", { status: 200 });
  }
});

// Dust & Wipes — outbound WhatsApp dispatch (Phase B3).
// Reads a dw_messages row by id and sends its body to the thread's phone
// via the Meta WhatsApp Cloud API. Env-gated: without WHATSAPP_ACCESS_TOKEN
// + WHATSAPP_PHONE_NUMBER_ID it returns 501 and the message simply stays
// status "sent" locally — the inbox keeps working before credentials exist.
//
// Secrets required for live sending:
//   WHATSAPP_ACCESS_TOKEN     — Meta system-user token
//   WHATSAPP_PHONE_NUMBER_ID  — the business number's id

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return new Response(JSON.stringify({ ok: false, reason: "whatsapp credentials not configured" }), { status: 501, headers: { "Content-Type": "application/json" } });
  }

  let body: { messageId?: string; conversationId?: string };
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.messageId) return new Response("messageId required", { status: 400 });

  const { data: msg } = await db.from("dw_messages").select("*").eq("id", body.messageId).single();
  if (!msg || msg.direction !== "out") return new Response("message not found", { status: 404 });
  const { data: cv } = await db.from("dw_conversations").select("*").eq("id", msg.conversation_id).single();
  if (!cv) return new Response("conversation not found", { status: 404 });

  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cv.contact_phone,
        type: "text",
        text: { body: msg.body },
      }),
    });
    const out = await r.json();
    if (!r.ok) {
      console.error("[wa-send] graph error:", JSON.stringify(out));
      await db.from("dw_messages").update({ status: "failed" }).eq("id", msg.id);
      return new Response(JSON.stringify({ ok: false, error: out }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
    const waId = out?.messages?.[0]?.id || "";
    await db.from("dw_messages").update({ status: "delivered", wa_message_id: waId }).eq("id", msg.id);
    return new Response(JSON.stringify({ ok: true, waId }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[wa-send] dispatch error:", e);
    await db.from("dw_messages").update({ status: "failed" }).eq("id", msg.id);
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

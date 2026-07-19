// Dust & Wipes — AI auto-responder (Phase B4).
// Invoked by whatsapp-webhook after each inbound message on threads with
// ai_enabled. Reads recent history, asks Claude for a short qualifying
// reply, records it (ai_generated=true), and dispatches via send-whatsapp.
//
// Env-gated: without ANTHROPIC_API_KEY it returns 501 and does nothing —
// threads simply wait for a human. Per-thread off switch: ai_enabled=false.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const SYSTEM = `You are the WhatsApp assistant for Dust & Wipes Limited, a professional cleaning and pest-control company in Abuja, Nigeria.

Your job: respond fast, warmly and briefly (this is WhatsApp — 2–4 short sentences max), and QUALIFY the inquiry by learning, over the conversation, three things:
1. What service they need (cleaning, pest control, fumigation, post-construction, etc.)
2. The location/address of the site
3. Their preferred date

Rules:
- Never invent prices. If asked, say a supervisor will confirm an exact quote the same day.
- Once you have service + location + date, confirm a summary and say the team will confirm the booking shortly.
- If the person asks for a human, is upset, or the request is complex (contracts, complaints, payments), reply that you're connecting them to the team — and nothing else.
- Nigerian context: greetings matter; be courteous, never robotic. English only unless the customer writes otherwise.
- Never mention that you are an AI language model. You are "the Dust & Wipes assistant".`;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ ok: false, reason: "ANTHROPIC_API_KEY not configured" }), { status: 501, headers: { "Content-Type": "application/json" } });
  }

  let body: { conversationId?: string };
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.conversationId) return new Response("conversationId required", { status: 400 });

  const { data: cv } = await db.from("dw_conversations").select("*").eq("id", body.conversationId).single();
  if (!cv) return new Response("conversation not found", { status: 404 });
  if (cv.ai_enabled === false) return new Response(JSON.stringify({ ok: false, reason: "ai disabled for thread" }), { status: 200 });

  // Last 20 messages, chronological, mapped to Claude roles.
  const { data: hist } = await db.from("dw_messages").select("*")
    .eq("conversation_id", cv.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const messages = (hist || []).reverse().map((m: any) => ({
    role: m.direction === "in" ? "user" : "assistant",
    content: String(m.body || ""),
  })).filter((m: any) => m.content);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response(JSON.stringify({ ok: false, reason: "nothing to answer" }), { status: 200 });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM,
        messages,
      }),
    });
    const out = await r.json();
    if (!r.ok) {
      console.error("[ai] anthropic error:", JSON.stringify(out));
      return new Response(JSON.stringify({ ok: false }), { status: 502 });
    }
    const reply = (out?.content?.[0]?.text || "").trim();
    if (!reply) return new Response(JSON.stringify({ ok: false, reason: "empty reply" }), { status: 200 });

    const msgId = `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.from("dw_messages").insert({
      id: msgId,
      conversation_id: cv.id,
      direction: "out",
      body: reply,
      status: "sent",
      sender_name: "D&W Assistant",
      ai_generated: true,
    });
    await db.from("dw_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: reply.slice(0, 80),
    }).eq("id", cv.id);

    // Dispatch to WhatsApp (501 no-op until provider secrets exist)
    fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ messageId: msgId }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, reply }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[ai] responder error:", e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});

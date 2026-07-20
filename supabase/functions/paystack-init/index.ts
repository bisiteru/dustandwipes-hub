// Dust & Wipes — Paystack transaction init (Phase D3).
// Given an invoice id, initializes a Paystack transaction and returns the
// hosted checkout URL. Env-gated: without PAYSTACK_SECRET_KEY it returns 501
// and the invoice still works as a document. Amount is in kobo (×100).
//
// Secret required: PAYSTACK_SECRET_KEY (sk_...)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!PAYSTACK_SECRET) {
    return new Response(JSON.stringify({ ok: false, reason: "PAYSTACK_SECRET_KEY not configured" }), { status: 501, headers: { "Content-Type": "application/json" } });
  }

  let body: { invoiceId?: string; callbackUrl?: string };
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.invoiceId) return new Response("invoiceId required", { status: 400 });

  const { data: row } = await db.from("dw_invoices").select("record").eq("id", body.invoiceId).single();
  const inv = row?.record;
  if (!inv) return new Response("invoice not found", { status: 404 });
  const total = Number(inv.total) || 0;
  if (total <= 0) return new Response(JSON.stringify({ ok: false, reason: "invoice total is zero" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const email = String(inv.contactEmail || "").trim() || `billing+${inv.id}@dustandwipes.com`;

  try {
    const r = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Math.round(total * 100),
        currency: "NGN",
        reference: `dw_${inv.id}_${Date.now()}`,
        callback_url: body.callbackUrl || undefined,
        metadata: { invoiceId: inv.id, invoiceNo: inv.invoiceNo, client: inv.clientName },
      }),
    });
    const out = await r.json();
    if (!r.ok || !out?.status) {
      console.error("[paystack-init] error:", JSON.stringify(out));
      return new Response(JSON.stringify({ ok: false, error: out }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
    await db.from("dw_invoices").update({
      record: { ...inv, status: inv.status === "Paid" ? "Paid" : "Sent", paystackRef: out.data.reference },
    }).eq("id", inv.id);

    return new Response(JSON.stringify({ ok: true, authorization_url: out.data.authorization_url, reference: out.data.reference }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[paystack-init] dispatch error:", e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});

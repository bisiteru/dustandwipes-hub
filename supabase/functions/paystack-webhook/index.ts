// Dust & Wipes — Paystack webhook (Phase D3).
// verify_jwt OFF: authenticity is Paystack's own HMAC-SHA512 signature over
// the raw body using PAYSTACK_SECRET_KEY (x-paystack-signature header).
// On charge.success we mark the matching invoice Paid.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!PAYSTACK_SECRET) return new Response("not configured", { status: 501 });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (sig !== expected) {
    console.warn("[paystack-hook] bad signature");
    return new Response("invalid signature", { status: 401 });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  try {
    if (evt?.event === "charge.success") {
      const data = evt.data || {};
      const invoiceId = data?.metadata?.invoiceId || "";
      const ref = data?.reference || "";
      let row: any = null;
      if (invoiceId) {
        const { data: r } = await db.from("dw_invoices").select("record").eq("id", invoiceId).maybeSingle();
        row = r;
      }
      if (!row && ref) {
        const { data: all } = await db.from("dw_invoices").select("id, record");
        const match = (all || []).find((x: any) => x.record?.paystackRef === ref);
        if (match) row = { record: match.record };
      }
      if (row?.record) {
        const inv = row.record;
        await db.from("dw_invoices").update({
          record: { ...inv, status: "Paid", paidAt: new Date().toISOString(), paystackRef: ref || inv.paystackRef },
        }).eq("id", inv.id);
      }
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[paystack-hook] error:", e);
    return new Response("ok", { status: 200 });
  }
});

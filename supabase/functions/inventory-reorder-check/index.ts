/**
 * Dust & Wipes — Inventory Reorder Check Edge Function
 *
 * Triggered daily to scan inventory levels.
 * For items at or below their reorder point:
 *  1. Sends an email alert to the operations team
 *  2. Creates draft requisition records in Supabase for each low-stock item
 *
 * Deploy:
 *   supabase functions deploy inventory-reorder-check
 *
 * Schedule (pg_cron — run daily at 07:30):
 *   select cron.schedule(
 *     'inventory-reorder-daily',
 *     '30 7 * * *',
 *     $$ select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/inventory-reorder-check',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}',
 *       body := '{}'
 *     ) $$
 *   );
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_EMAIL   = Deno.env.get("ALERT_EMAIL") ?? "admin@dustandwipes.com";

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Load inventory
  const { data, error } = await supabase.from("dw_inventory").select("id, record");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const lowStock = (data ?? [])
    .map((r) => r.record)
    .filter((i) => i && typeof i.qty === "number" && i.qty <= (i.reorder ?? 0));

  if (lowStock.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: "All stock levels are healthy" }));
  }

  const today = new Date().toISOString().split("T")[0];

  // Auto-create draft requisitions for each low-stock item
  const draftReqs = lowStock.map((item) => ({
    id: `req-auto-${item.id}-${today}`,
    record: {
      id: `req-auto-${item.id}-${today}`,
      clientName: "Internal — Inventory Reorder",
      svc: item.cat || "Supplies",
      loc: "Warehouse",
      prefDate: today,
      src: "Auto-generated",
      status: "Pending",
      notes: `Auto-generated: ${item.item} is low (${item.qty} in stock, reorder at ${item.reorder}). Please raise a purchase order.`,
      created: today,
      items: [{ name: item.item, qty: Math.max(1, (item.reorder ?? 0) * 2 - item.qty), unit: "units" }],
    },
    updated_at: new Date().toISOString(),
  }));

  // Upsert draft reqs (won't duplicate if cron runs twice)
  await supabase
    .from("dw_requisitions")
    .upsert(draftReqs, { onConflict: "id" });

  // Build email
  const rows = lowStock
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.item}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.cat}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700">${i.qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.reorder}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:#0B3518;padding:24px;text-align:center">
        <h2 style="color:white;margin:0">📦 Low Stock Alert</h2>
        <p style="color:#6EAD7E;margin:6px 0 0">Dust &amp; Wipes Inventory — ${today}</p>
      </div>
      <div style="padding:24px;background:#f9fafb">
        <p style="color:#374151">${lowStock.length} item(s) are at or below their reorder threshold. Draft requisitions have been created automatically.</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">ITEM</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">CATEGORY</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">IN STOCK</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">REORDER AT</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#6b7280">
          Log in to the Operations Hub → Requisitions to review and approve these orders.
        </p>
      </div>
    </div>`;

  if (RESEND_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "noreply@mail.dustandwipes.com",
        to: [ALERT_EMAIL],
        subject: `📦 ${lowStock.length} Low Stock Item(s) — Dust & Wipes`,
        html,
      }),
    });
  }

  return new Response(
    JSON.stringify({ sent: !!RESEND_KEY, itemsAffected: lowStock.length, requisitionsCreated: draftReqs.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});

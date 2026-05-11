/**
 * Dust & Wipes — Contract Expiry Alert Edge Function
 *
 * Triggered daily via Supabase cron (pg_cron) or a Vercel cron job.
 * Checks for contracts expiring within 60 days and sends email alerts
 * to the admin team.
 *
 * Deploy:
 *   supabase functions deploy contract-expiry-alert
 *
 * Schedule (in Supabase SQL editor):
 *   select cron.schedule(
 *     'contract-expiry-daily',
 *     '0 7 * * *',  -- every day at 07:00 WAT (06:00 UTC)
 *     $$ select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/contract-expiry-alert',
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

  // Load all clients from the dw_clients table
  const { data, error } = await supabase
    .from("dw_clients")
    .select("id, record");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const today = new Date();
  const threshold60 = new Date(today.getTime() + 60 * 86400_000);
  const threshold30 = new Date(today.getTime() + 30 * 86400_000);

  const expiring: { name: string; daysLeft: number; status: string }[] = [];

  for (const row of data ?? []) {
    const c = row.record;
    if (!c?.ce) continue;

    const expiry = new Date(c.ce);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400_000);

    if (daysLeft < 0) {
      expiring.push({ name: c.name, daysLeft, status: "Expired" });
    } else if (daysLeft <= 30) {
      expiring.push({ name: c.name, daysLeft, status: "Critical" });
    } else if (daysLeft <= 60) {
      expiring.push({ name: c.name, daysLeft, status: "Expiring Soon" });
    }
  }

  if (expiring.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: "No contracts expiring soon" }));
  }

  // Build email HTML
  const rows = expiring
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${
            c.daysLeft < 0 ? "#dc2626" : c.daysLeft <= 30 ? "#e85d04" : "#d97706"
          };font-weight:700">${c.status}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${
            c.daysLeft < 0 ? `Expired ${Math.abs(c.daysLeft)}d ago` : `${c.daysLeft} days`
          }</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:#0B3518;padding:24px;text-align:center">
        <h2 style="color:white;margin:0">🔔 Contract Expiry Alert</h2>
        <p style="color:#6EAD7E;margin:6px 0 0">Dust &amp; Wipes Operations Hub — ${today.toDateString()}</p>
      </div>
      <div style="padding:24px;background:#f9fafb">
        <p style="color:#374151">${expiring.length} contract(s) require attention:</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">CLIENT</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">STATUS</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">TIME LEFT</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#6b7280">
          Log in to the Operations Hub to review and renew these contracts.
        </p>
      </div>
    </div>`;

  let resendResult: unknown = null;
  if (RESEND_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "noreply@mail.dustandwipes.com",
        to: [ALERT_EMAIL],
        subject: `⚠️ ${expiring.length} Contract(s) Expiring — Dust & Wipes`,
        html,
      }),
    });
    resendResult = await res.json();
  }

  return new Response(
    JSON.stringify({ sent: !!RESEND_KEY, contracts: expiring.length, to: ALERT_EMAIL, resend: resendResult }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// Owner alerts — "someone signed up / paid / cancelled" pings for the Owner.
//
// Used by: auth-email-hook (new signup), whop-webhook (payment, cancellation,
// unmatched payment).
//
// Secrets (supabase secrets set …) — all optional, set at least one channel:
//   TELEGRAM_BOT_TOKEN  — from @BotFather (123456:ABC…)
//   TELEGRAM_CHAT_ID    — your chat id with the bot (see docs/NOTIFICATIONS_SETUP.md)
//   OWNER_NOTIFY_EMAIL  — inbox for the same alerts, sent through Resend
//                         (counts toward the Resend daily quota — Telegram doesn't)
//
// Alerts are a nice-to-have: they never throw and never hold up the caller.
// On Supabase they run as a background task (EdgeRuntime.waitUntil), so a slow
// Telegram/Resend call can't delay a signup email or a webhook response.

import { sendEmail } from "./emails.ts";

export interface OwnerAlert {
  /** One-line headline, e.g. "💰 New payment". */
  title: string;
  /** Detail lines shown under the title. */
  lines: string[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTelegram(text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Plain text (no parse_mode) so emails/names never need escaping.
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[notify] Telegram ${res.status}: ${detail}`);
  }
}

async function sendOwnerEmail(alert: OwnerAlert): Promise<void> {
  const to = Deno.env.get("OWNER_NOTIFY_EMAIL");
  if (!to) return;
  const text = alert.lines.join("\n");
  await sendEmail(to, {
    subject: `[MagnetEngine] ${alert.title}`,
    text,
    html: `<p>${alert.lines.map(escapeHtml).join("<br>")}</p>`,
  });
}

async function deliver(alert: OwnerAlert): Promise<void> {
  const text = [alert.title, "", ...alert.lines].join("\n");
  const results = await Promise.allSettled([sendTelegram(text), sendOwnerEmail(alert)]);
  for (const r of results) {
    if (r.status === "rejected") console.error(`[notify] alert failed: ${r.reason}`);
  }
}

/** Fire-and-forget on Supabase (background task); awaited elsewhere so local
 * runs still deliver. Either way it never throws. */
export function runInBackground(task: Promise<unknown>): Promise<void> {
  const safe = task.then(() => {}, (e) => console.error(`[notify] background task failed: ${e}`));
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(safe);
    return Promise.resolve();
  }
  return safe;
}

export function notifyOwner(alert: OwnerAlert): Promise<void> {
  return runInBackground(deliver(alert));
}

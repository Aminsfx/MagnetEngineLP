// Shared transactional email layer — Resend API + branded templates.
//
// Used by: auth-email-hook (signup confirm / password reset / magic link…),
// whop-webhook (payment confirmed + onboarding), admin-api (manual activation
// → onboarding).
//
// Secrets (supabase secrets set …):
//   RESEND_API_KEY   — required to send anything (re_…)
//   EMAIL_FROM       — verified sender, e.g. "MagnetEngine <hello@yourdomain.com>"
//   APP_URL          — public app origin for dashboard links (e.g. https://app.example.com)
//   ONBOARDING_CALL_URL — booking link for the setup call (defaults to cal.com/magnetengine/30min)
//   SOP_DOC_URL      — DM Psychology Playbook link (defaults to the bundled PDF at
//                      public/downloads/MagnetEngine-DM-Playbook.pdf; override to
//                      point at a Google Doc etc. instead)
//   CRM_SHEET_URL    — Google Sheet: CRM tracker template (onboarding email; omitted if unset)
//
// The Resend API key lives ONLY here (server-side). The browser never sends
// email and never sees the key — same rule as every other integration.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  skipped?: string;
  error?: string;
}

/** Send one email through Resend. Never throws — callers decide whether a
 * failure is fatal (auth hook) or just logged (webhooks). */
export async function sendEmail(
  to: string,
  content: EmailContent,
  opts: { scheduledAt?: string; idempotencyKey?: string } = {},
): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) {
    const skipped = `email skipped (${!apiKey ? "RESEND_API_KEY" : "EMAIL_FROM"} not set)`;
    console.warn(`[emails] ${skipped}: "${content.subject}" → ${to}`);
    return { ok: false, skipped };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: content.html,
        text: content.text,
        ...(opts.scheduledAt ? { scheduled_at: opts.scheduledAt } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[emails] Resend ${res.status} for "${content.subject}" → ${to}: ${detail}`);
      return { ok: false, error: `Resend responded ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network error";
    console.error(`[emails] send failed for "${content.subject}" → ${to}: ${msg}`);
    return { ok: false, error: msg };
  }
}

export function appUrl(): string {
  return (Deno.env.get("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "Hey Amine," or "Hey there," — name is user-supplied, always escaped. */
function greeting(firstName?: string | null): string {
  const name = (firstName ?? "").trim();
  return name ? `Hey ${escapeHtml(name)},` : "Hey there,";
}

// ── Layout ───────────────────────────────────────────────────────────────────
// Inline-styled, single-column, 560px — renders in Gmail/Outlook/Apple Mail.
// Brand: near-black green (#030A06) backdrop, emerald accent, zinc text.

const S = {
  body: "margin:0;padding:0;background-color:#030A06;",
  wrap: "width:100%;background-color:#030A06;padding:32px 16px;",
  card: "max-width:560px;margin:0 auto;background-color:#0B1511;border:1px solid #1E2C24;border-radius:16px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
  logo: "font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;margin:0 0 28px;",
  logoDot: "color:#34D399;",
  h1: "font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;margin:0 0 16px;",
  p: "font-size:15px;line-height:1.65;color:#A7B3AC;margin:0 0 16px;",
  strong: "color:#E4EAE6;font-weight:600;",
  btnWrap: "margin:28px 0;",
  btn: "display:inline-block;background-color:#10B981;color:#04140C;font-size:15px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;",
  linkFallback: "font-size:12px;line-height:1.6;color:#5E6B63;margin:0 0 16px;word-break:break-all;",
  hr: "border:none;border-top:1px solid #1E2C24;margin:28px 0;",
  li: "font-size:15px;line-height:1.65;color:#A7B3AC;margin:0 0 12px;",
  a: "color:#34D399;text-decoration:underline;",
  muted: "font-size:13px;line-height:1.6;color:#5E6B63;margin:24px 0 0;",
  footer: "max-width:560px;margin:0 auto;padding:20px 8px 0;font-size:12px;line-height:1.6;color:#3E4A43;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
  code: "display:inline-block;background-color:#08110D;border:1px solid #1E2C24;border-radius:8px;padding:12px 20px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:6px;color:#34D399;",
};

function layout(bodyHtml: string, previewText: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="${S.body}">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}</div>
<div style="${S.wrap}">
  <div style="${S.card}">
    <p style="${S.logo}">Magnet<span style="${S.logoDot}">Engine</span></p>
    ${bodyHtml}
  </div>
  <div style="${S.footer}">
    MagnetEngine — AI-powered Instagram lead automation.<br>
    You're receiving this because you have a MagnetEngine account.
  </div>
</div>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<div style="${S.btnWrap}"><a href="${url}" style="${S.btn}">${label}</a></div>
<p style="${S.linkFallback}">If the button doesn't work, copy this link into your browser:<br>${url}</p>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

/** 1. Signup — welcome + confirm-email (sent by the auth hook on sign-up). */
export function welcomeEmail(firstName: string | null, confirmUrl: string): EmailContent {
  const subject = "Welcome to MagnetEngine — confirm your email";
  const html = layout(
    `<h1 style="${S.h1}">Welcome to MagnetEngine 👋</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">You're one click away from your new lead machine. Confirm your email to activate your account:</p>
${button(confirmUrl, "Confirm my email")}
<hr style="${S.hr}">
<p style="${S.p}"><span style="${S.strong}">What happens next?</span></p>
<p style="${S.li}">1&nbsp;&nbsp;Confirm your email (this button ☝️)</p>
<p style="${S.li}">2&nbsp;&nbsp;Log in and complete your membership checkout</p>
<p style="${S.li}">3&nbsp;&nbsp;We'll send you the full setup guide — you'll be scraping leads and sending AI-crafted DMs the same day</p>
<p style="${S.muted}">Didn't create a MagnetEngine account? You can safely ignore this email.</p>`,
    "Confirm your email to activate your MagnetEngine account.",
  );
  const text = `Welcome to MagnetEngine!

Confirm your email to activate your account:
${confirmUrl}

What happens next?
1. Confirm your email
2. Log in and complete your membership checkout
3. We'll send you the full setup guide

Didn't create a MagnetEngine account? You can safely ignore this email.`;
  return { subject, html, text };
}

/** 2. Password reset (sent by the auth hook on "forgot password"). */
export function resetPasswordEmail(firstName: string | null, resetUrl: string): EmailContent {
  const subject = "Reset your MagnetEngine password";
  const html = layout(
    `<h1 style="${S.h1}">Reset your password</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">We received a request to reset the password for your MagnetEngine account. Click below to choose a new one:</p>
${button(resetUrl, "Reset my password")}
<p style="${S.muted}">This link expires after a short time for security. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>`,
    "Choose a new password for your MagnetEngine account.",
  );
  const text = `Reset your MagnetEngine password

We received a request to reset your password. Open this link to choose a new one:
${resetUrl}

If you didn't request a reset, you can safely ignore this email — your password won't change.`;
  return { subject, html, text };
}

/** 3. Payment confirmed (sent by whop-webhook on membership activation). */
export function paymentConfirmedEmail(firstName: string | null, planLabel: string): EmailContent {
  const dashboard = `${appUrl()}/dashboard`;
  const subject = "Payment confirmed — your MagnetEngine access is live 🎉";
  const html = layout(
    `<h1 style="${S.h1}">You're in — payment confirmed 🎉</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Your payment went through and your <span style="${S.strong}">${escapeHtml(planLabel)}</span> membership is now active. The full dashboard is unlocked.</p>
${button(dashboard, "Open my dashboard")}
<p style="${S.p}">In the next few minutes you'll get a second email with your <span style="${S.strong}">setup guide</span> — the SOPs and a step-by-step video to get your first campaign running today.</p>
<p style="${S.muted}">Your receipt and billing details are managed by Whop — check your Whop account for invoices.</p>`,
    "Your MagnetEngine membership is active — dashboard unlocked.",
  );
  const text = `Payment confirmed — you're in!

Your ${planLabel} membership is now active and the full dashboard is unlocked.

Open your dashboard: ${dashboard}

In the next few minutes you'll get a second email with your setup guide (SOPs + step-by-step video).

Your receipt and billing details are managed by Whop.`;
  return { subject, html, text };
}

/** 4. Onboarding / getting started (scheduled after payment, or on manual
 * activation from /admin). SOP + CRM links render only when configured; the
 * onboarding-call link always renders (env override, cal.com default). */
export function onboardingEmail(firstName: string | null): EmailContent {
  const dashboard = `${appUrl()}/dashboard`;
  const callUrl = Deno.env.get("ONBOARDING_CALL_URL") ?? "https://cal.com/magnetengine/30min";
  // Bundled with the app (public/downloads/) — always available, no Google Doc
  // publishing step required. SOP_DOC_URL can still override it (e.g. to point
  // at a living Google Doc instead) without a redeploy.
  const sopUrl = Deno.env.get("SOP_DOC_URL") || `${appUrl()}/downloads/MagnetEngine-DM-Playbook.pdf`;
  const crmUrl = Deno.env.get("CRM_SHEET_URL") ?? "";

  const subject = "Your MagnetEngine setup guide — start here 🚀";

  let step = 1;
  const htmlSteps: string[] = [];
  const textSteps: string[] = [];
  htmlSteps.push(
    `<p style="${S.li}"><span style="${S.strong}">${step}. Book your onboarding call</span> (30 min) — we'll set up your first campaign together, live:<br><a href="${callUrl}" style="${S.a}">${callUrl}</a></p>`,
  );
  textSteps.push(`${step}. Book your onboarding call (30 min) — we'll set up your first campaign together: ${callUrl}`);
  step++;
  htmlSteps.push(
    `<p style="${S.li}"><span style="${S.strong}">${step}. Read the DM Psychology Playbook</span> (PDF) — the psychology behind openers, follow-ups, and turning replies into booked calls:<br><a href="${sopUrl}" style="${S.a}">${sopUrl}</a></p>`,
  );
  textSteps.push(`${step}. Read the DM Psychology Playbook (PDF): ${sopUrl}`);
  step++;
  if (crmUrl) {
    htmlSteps.push(
      `<p style="${S.li}"><span style="${S.strong}">${step}. Make your copy of the CRM tracker</span> — track every lead from replied → booked → cash collected (File → Make a copy):<br><a href="${crmUrl}" style="${S.a}">${crmUrl}</a></p>`,
    );
    textSteps.push(`${step}. Make your copy of the CRM tracker (File → Make a copy): ${crmUrl}`);
    step++;
  }
  htmlSteps.push(
    `<p style="${S.li}"><span style="${S.strong}">${step}. Set up your AI Prompt Wizard</span> — Settings → tell MagnetEngine about your business so every DM sounds like you.</p>`,
  );
  textSteps.push(`${step}. Set up your AI Prompt Wizard (Settings) — tell MagnetEngine about your business.`);
  step++;
  htmlSteps.push(
    `<p style="${S.li}"><span style="${S.strong}">${step}. Launch your first campaign</span> — Campaign → search your niche, scrape leads, generate DMs and approve them in the queue.</p>`,
  );
  textSteps.push(`${step}. Launch your first campaign — scrape leads, generate DMs, approve them in the queue.`);

  const html = layout(
    `<h1 style="${S.h1}">Let's get you set up 🚀</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Welcome aboard! Here's everything you need to go from zero to your first booked call. Follow these steps in order:</p>
${htmlSteps.join("\n")}
${button(dashboard, "Start my setup")}
<hr style="${S.hr}">
<p style="${S.p}"><span style="${S.strong}">Pro tip:</span> your first campaign doesn't need to be perfect. Scrape 50 leads in your niche today, approve 10 DMs, and iterate from there.</p>
<p style="${S.muted}">Stuck on anything? Just reply to this email and we'll help you out.</p>`,
    "Your setup guide: video walkthrough, SOPs, and your first campaign.",
  );
  const text = `Let's get you set up!

Welcome aboard. Follow these steps in order:

${textSteps.join("\n")}

Start here: ${dashboard}

Pro tip: your first campaign doesn't need to be perfect. Scrape 50 leads in your niche today, approve 10 DMs, and iterate from there.

Stuck on anything? Just reply to this email.`;
  return { subject, html, text };
}

// ── Secondary auth-hook templates (magic link, invite, email change, reauth) ──

export function magicLinkEmail(firstName: string | null, linkUrl: string): EmailContent {
  const subject = "Your MagnetEngine sign-in link";
  const html = layout(
    `<h1 style="${S.h1}">Sign in to MagnetEngine</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Click below to sign in — no password needed:</p>
${button(linkUrl, "Sign in")}
<p style="${S.muted}">This link expires after a short time. If you didn't request it, you can safely ignore this email.</p>`,
    "Your one-click sign-in link for MagnetEngine.",
  );
  const text = `Sign in to MagnetEngine:
${linkUrl}

This link expires after a short time. If you didn't request it, ignore this email.`;
  return { subject, html, text };
}

export function inviteEmail(inviteUrl: string): EmailContent {
  const subject = "You've been invited to MagnetEngine";
  const html = layout(
    `<h1 style="${S.h1}">You've been invited 🎉</h1>
<p style="${S.p}">You've been invited to join MagnetEngine — AI-powered Instagram lead automation. Accept the invite to create your account:</p>
${button(inviteUrl, "Accept invite")}`,
    "Accept your invitation to MagnetEngine.",
  );
  const text = `You've been invited to MagnetEngine.

Accept your invite: ${inviteUrl}`;
  return { subject, html, text };
}

export function emailChangeEmail(firstName: string | null, confirmUrl: string, newEmail: string): EmailContent {
  const subject = "Confirm your new email address";
  const html = layout(
    `<h1 style="${S.h1}">Confirm your new email</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">You asked to change your MagnetEngine email to <span style="${S.strong}">${escapeHtml(newEmail)}</span>. Confirm the change below:</p>
${button(confirmUrl, "Confirm email change")}
<p style="${S.muted}">If you didn't request this change, ignore this email and consider resetting your password.</p>`,
    "Confirm the email change on your MagnetEngine account.",
  );
  const text = `Confirm your new MagnetEngine email (${newEmail}):
${confirmUrl}

If you didn't request this change, ignore this email and consider resetting your password.`;
  return { subject, html, text };
}

export function reauthenticationEmail(firstName: string | null, token: string): EmailContent {
  const subject = "Your MagnetEngine verification code";
  const html = layout(
    `<h1 style="${S.h1}">Your verification code</h1>
<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Enter this code to confirm it's really you:</p>
<p style="margin:24px 0;"><span style="${S.code}">${escapeHtml(token)}</span></p>
<p style="${S.muted}">If you didn't request this code, you can safely ignore this email.</p>`,
    "Your MagnetEngine verification code.",
  );
  const text = `Your MagnetEngine verification code: ${token}

If you didn't request this code, you can safely ignore this email.`;
  return { subject, html, text };
}

// Shared transactional email layer — Resend API + plain-text-style templates.
//
// Used by: auth-email-hook (signup confirm / password reset / magic link…),
// whop-webhook (payment confirmed + onboarding), admin-api (manual activation
// → onboarding).
//
// Secrets (supabase secrets set …):
//   RESEND_API_KEY   — required to send anything (re_…)
//   EMAIL_FROM       — verified sender, e.g. "MagnetEngine <amine@magnetengine.xyz>"
//   APP_URL          — public app origin for dashboard links (e.g. https://app.example.com)
//   ONBOARDING_CALL_URL — booking link for the setup call (defaults to cal.com/magnetengine/30min)
//   SOP_DOC_URL      — DM Psychology Playbook link (defaults to the bundled PDF at
//                      public/downloads/MagnetEngine-DM-Playbook.pdf; override to
//                      point at a Google Doc etc. instead)
//
// The Resend API key lives ONLY here (server-side). The browser never sends
// email and never sees the key — same rule as every other integration.
//
// Template style: deliberately plain and professional — black text on white,
// default link styling, no brand colors, no buttons, no emoji.

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

/** "Hi Amine," or "Hi," — name is user-supplied, always escaped. */
function greeting(firstName?: string | null): string {
  const name = (firstName ?? "").trim();
  return name ? `Hi ${escapeHtml(name)},` : "Hi,";
}

// ── Layout ───────────────────────────────────────────────────────────────────
// Plain and professional: system font, black text on white, default links.

const FONT =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const S = {
  p: `margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a1a1a;${FONT}`,
  li: `margin:0 0 10px;font-size:14px;line-height:1.6;color:#1a1a1a;${FONT}`,
  small: `margin:0 0 16px;font-size:12px;line-height:1.6;color:#666666;word-break:break-all;${FONT}`,
};

function layout(bodyHtml: string, previewText: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}</div>
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
${bodyHtml}
</div>
</body>
</html>`;
}

/** A labeled action link followed by the raw URL as a copy-paste fallback. */
function link(url: string, label: string): string {
  return `<p style="${S.p}"><a href="${url}">${label}</a></p>
<p style="${S.small}">Or copy this link into your browser:<br>${url}</p>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

/** 1. Signup — welcome + confirm-email (sent by the auth hook on sign-up). */
export function welcomeEmail(firstName: string | null, confirmUrl: string): EmailContent {
  const subject = "Confirm your MagnetEngine account";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Thanks for creating a MagnetEngine account. Please confirm your email address to activate it:</p>
${link(confirmUrl, "Confirm my email")}
<p style="${S.p}">What happens next:</p>
<p style="${S.li}">1. Confirm your email</p>
<p style="${S.li}">2. Log in and complete your membership checkout</p>
<p style="${S.li}">3. We'll send you the full setup guide so you can launch your first campaign the same day</p>
<p style="${S.p}">If you didn't create a MagnetEngine account, you can safely ignore this email.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Please confirm your email address to activate your MagnetEngine account.",
  );
  const text = `${greetingText(firstName)}

Thanks for creating a MagnetEngine account. Please confirm your email address to activate it:

${confirmUrl}

What happens next:
1. Confirm your email
2. Log in and complete your membership checkout
3. We'll send you the full setup guide so you can launch your first campaign the same day

If you didn't create a MagnetEngine account, you can safely ignore this email.

— The MagnetEngine Team`;
  return { subject, html, text };
}

/** 2. Password reset (sent by the auth hook on "forgot password"). */
export function resetPasswordEmail(firstName: string | null, resetUrl: string): EmailContent {
  const subject = "Reset your MagnetEngine password";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">We received a request to reset the password for your MagnetEngine account. Use the link below to choose a new one:</p>
${link(resetUrl, "Reset my password")}
<p style="${S.p}">This link expires after a short time for security. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Choose a new password for your MagnetEngine account.",
  );
  const text = `${greetingText(firstName)}

We received a request to reset the password for your MagnetEngine account. Open this link to choose a new one:

${resetUrl}

This link expires after a short time for security. If you didn't request a reset, you can safely ignore this email — your password won't change.

— The MagnetEngine Team`;
  return { subject, html, text };
}

/** 3. Payment confirmed (sent by whop-webhook on membership activation). */
export function paymentConfirmedEmail(firstName: string | null, planLabel: string): EmailContent {
  const dashboard = `${appUrl()}/dashboard`;
  const subject = "Payment confirmed — your MagnetEngine membership is active";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Your payment was received and your ${escapeHtml(planLabel)} membership is now active. Your dashboard is unlocked:</p>
${link(dashboard, "Open my dashboard")}
<p style="${S.p}">Within the next few minutes you'll receive a second email with your setup guide — everything you need to launch your first campaign.</p>
<p style="${S.p}">Your receipt and billing details are managed by Whop; check your Whop account for invoices.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Your MagnetEngine membership is active and your dashboard is unlocked.",
  );
  const text = `${greetingText(firstName)}

Your payment was received and your ${planLabel} membership is now active. Your dashboard is unlocked:

${dashboard}

Within the next few minutes you'll receive a second email with your setup guide — everything you need to launch your first campaign.

Your receipt and billing details are managed by Whop; check your Whop account for invoices.

— The MagnetEngine Team`;
  return { subject, html, text };
}

/** 4. Onboarding / getting started (scheduled after payment, or on manual
 * activation from /admin). The onboarding-call link always renders (env
 * override, cal.com default). */
export function onboardingEmail(firstName: string | null): EmailContent {
  const dashboard = `${appUrl()}/dashboard`;
  const callUrl = Deno.env.get("ONBOARDING_CALL_URL") ?? "https://cal.com/magnetengine/30min";
  // Bundled with the app (public/downloads/) — always available, no Google Doc
  // publishing step required. SOP_DOC_URL can still override it (e.g. to point
  // at a living Google Doc instead) without a redeploy.
  const sopUrl = Deno.env.get("SOP_DOC_URL") || `${appUrl()}/downloads/MagnetEngine-DM-Playbook.pdf`;

  const subject = "Your MagnetEngine setup guide";

  // Same structure as the confirmation email: greeting → one primary action
  // link (with copy-paste fallback) → "What happens next:" numbered list.
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Welcome aboard. The first step is to book your onboarding call — we'll set up your first campaign together:</p>
${link(callUrl, "Book my onboarding call")}
<p style="${S.p}">What happens next:</p>
<p style="${S.li}">1. Book your onboarding call (30 minutes)</p>
<p style="${S.li}">2. Read the <a href="${sopUrl}">DM Psychology Playbook</a> — how to turn cold DMs into booked calls</p>
<p style="${S.li}">3. Set up your AI Prompt Wizard — in Settings, tell MagnetEngine about your business so every DM sounds like you</p>
<p style="${S.li}">4. Launch your first campaign from your <a href="${dashboard}">dashboard</a> — search your niche, scrape leads, generate DMs and approve them in the queue</p>
<p style="${S.p}">If you have any questions, just reply to this email.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Book your onboarding call and launch your first campaign.",
  );
  const text = `${greetingText(firstName)}

Welcome aboard. The first step is to book your onboarding call — we'll set up your first campaign together:

${callUrl}

What happens next:
1. Book your onboarding call (30 minutes)
2. Read the DM Psychology Playbook: ${sopUrl}
3. Set up your AI Prompt Wizard — in Settings, tell MagnetEngine about your business so every DM sounds like you
4. Launch your first campaign from your dashboard: ${dashboard}

If you have any questions, just reply to this email.

— The MagnetEngine Team`;
  return { subject, html, text };
}

// ── Secondary auth-hook templates (magic link, invite, email change, reauth) ──

export function magicLinkEmail(firstName: string | null, linkUrl: string): EmailContent {
  const subject = "Your MagnetEngine sign-in link";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Use the link below to sign in to MagnetEngine — no password needed:</p>
${link(linkUrl, "Sign in")}
<p style="${S.p}">This link expires after a short time. If you didn't request it, you can safely ignore this email.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Your one-click sign-in link for MagnetEngine.",
  );
  const text = `${greetingText(firstName)}

Use this link to sign in to MagnetEngine — no password needed:

${linkUrl}

This link expires after a short time. If you didn't request it, you can safely ignore this email.

— The MagnetEngine Team`;
  return { subject, html, text };
}

export function inviteEmail(inviteUrl: string): EmailContent {
  const subject = "You've been invited to MagnetEngine";
  const html = layout(
    `<p style="${S.p}">Hi,</p>
<p style="${S.p}">You've been invited to join MagnetEngine — AI-powered Instagram lead automation. Use the link below to accept the invite and create your account:</p>
${link(inviteUrl, "Accept invite")}
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Accept your invitation to MagnetEngine.",
  );
  const text = `Hi,

You've been invited to join MagnetEngine — AI-powered Instagram lead automation. Accept your invite:

${inviteUrl}

— The MagnetEngine Team`;
  return { subject, html, text };
}

export function emailChangeEmail(firstName: string | null, confirmUrl: string, newEmail: string): EmailContent {
  const subject = "Confirm your new email address";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">You asked to change your MagnetEngine email to ${escapeHtml(newEmail)}. Confirm the change below:</p>
${link(confirmUrl, "Confirm email change")}
<p style="${S.p}">If you didn't request this change, ignore this email and consider resetting your password.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Confirm the email change on your MagnetEngine account.",
  );
  const text = `${greetingText(firstName)}

You asked to change your MagnetEngine email to ${newEmail}. Confirm the change:

${confirmUrl}

If you didn't request this change, ignore this email and consider resetting your password.

— The MagnetEngine Team`;
  return { subject, html, text };
}

export function reauthenticationEmail(firstName: string | null, token: string): EmailContent {
  const subject = "Your MagnetEngine verification code";
  const html = layout(
    `<p style="${S.p}">${greeting(firstName)}</p>
<p style="${S.p}">Enter this code to confirm it's really you:</p>
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;letter-spacing:4px;color:#1a1a1a;${FONT}">${escapeHtml(token)}</p>
<p style="${S.p}">If you didn't request this code, you can safely ignore this email.</p>
<p style="${S.p}">— The MagnetEngine Team</p>`,
    "Your MagnetEngine verification code.",
  );
  const text = `${greetingText(firstName)}

Enter this code to confirm it's really you: ${token}

If you didn't request this code, you can safely ignore this email.

— The MagnetEngine Team`;
  return { subject, html, text };
}

/** Plain-text variant of the greeting (no HTML escaping needed). */
function greetingText(firstName?: string | null): string {
  const name = (firstName ?? "").trim();
  return name ? `Hi ${name},` : "Hi,";
}

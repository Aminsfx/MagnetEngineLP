// Supabase Auth "Send Email" hook → branded emails via Resend.
//
// Once enabled, Supabase stops sending its default auth emails and calls this
// function instead for EVERY auth email: signup confirmation (the welcome
// email), password recovery, magic link, invite, email change and
// reauthentication codes.
//
// Deploy: supabase functions deploy auth-email-hook --no-verify-jwt
// Enable: Supabase dashboard → Authentication → Hooks → "Send Email" →
//         HTTPS → point at this function's URL → copy the generated secret:
//         supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_..."
// Also requires RESEND_API_KEY + EMAIL_FROM (see _shared/emails.ts).
//
// Security: requests are signed (Standard Webhooks) with the hook secret;
// unverified bodies are rejected and nothing is sent. See docs/EMAIL_SETUP.md.

import { Webhook } from "npm:standardwebhooks@1.0.0";
import {
  emailChangeEmail,
  inviteEmail,
  magicLinkEmail,
  reauthenticationEmail,
  resetPasswordEmail,
  sendEmail,
  welcomeEmail,
  type EmailContent,
} from "../_shared/emails.ts";

interface HookPayload {
  user: {
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Supabase verification link that completes the auth action, then redirects
 * back into the app (e.g. /login after signup, /reset-password for recovery). */
function actionLink(tokenHash: string, actionType: string, redirectTo: string): string {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const rawSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
  if (!rawSecret) return json(500, { error: "SEND_EMAIL_HOOK_SECRET not set" });
  // Dashboard shows the secret as "v1,whsec_<base64>" — the lib wants the base64.
  const secret = rawSecret.replace("v1,whsec_", "").replace("whsec_", "");

  const body = await req.text();

  let payload: HookPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(body, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    }) as HookPayload;
  } catch {
    return json(401, { error: "invalid signature" });
  }

  const { user, email_data: data } = payload;
  const firstName = (user.user_metadata?.first_name as string | undefined) ?? null;
  const link = actionLink(data.token_hash, data.email_action_type, data.redirect_to);

  let to = user.email;
  let content: EmailContent;

  switch (data.email_action_type) {
    case "signup":
      content = welcomeEmail(firstName, link);
      break;
    case "recovery":
      content = resetPasswordEmail(firstName, link);
      break;
    case "magiclink":
      content = magicLinkEmail(firstName, link);
      break;
    case "invite":
      content = inviteEmail(link);
      break;
    case "email_change":
    case "email_change_current":
    case "email_change_new": {
      const newEmail = user.new_email ?? user.email;
      // The "new address" confirmation goes to the new address with its own hash.
      if (data.email_action_type === "email_change_new" || (user.new_email && data.token_hash_new)) {
        to = user.new_email ?? to;
      }
      content = emailChangeEmail(firstName, link, newEmail);
      break;
    }
    case "reauthentication":
      content = reauthenticationEmail(firstName, data.token);
      break;
    default:
      console.warn(`[auth-email-hook] unhandled action type: ${data.email_action_type}`);
      content = magicLinkEmail(firstName, link);
  }

  const result = await sendEmail(to, content);
  if (!result.ok) {
    // Failing loudly makes Supabase surface the error instead of silently
    // swallowing a reset/confirmation email the user is waiting for.
    return json(500, {
      error: {
        http_code: 500,
        message: result.error ?? result.skipped ?? "email send failed",
      },
    });
  }

  return json(200, {});
});

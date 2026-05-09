import Mailgun from "mailgun.js";
import formData from "form-data";
import { RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";
import { htmlToPlainText } from "@/lib/email/html-to-text";

export function isMailgunConfigured(): boolean {
  const key = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const fromFull = process.env.MAILGUN_FROM?.trim();
  const fromEmail = process.env.MAILGUN_FROM_EMAIL?.trim();
  if (!key || !domain) return false;
  if (fromFull) return true;
  return Boolean(fromEmail);
}

/**
 * RFC 5322 From header. Never uses generic platform branding.
 * @param restaurantDisplayName used when MAILGUN_FROM_NAME is empty
 */
export function resolveMailgunFromHeader(restaurantDisplayName?: string): string {
  const full = process.env.MAILGUN_FROM?.trim();
  if (full) return full;

  const email = process.env.MAILGUN_FROM_EMAIL?.trim();
  if (!email) {
    throw new Error("MAILGUN_FROM or MAILGUN_FROM_EMAIL must be set when using Mailgun");
  }

  const name =
    process.env.MAILGUN_FROM_NAME?.trim() ||
    (restaurantDisplayName && restaurantDisplayName.trim()) ||
    RESTAURANT_DISPLAY_NAME;

  return `${name} <${email}>`;
}

export type SendMailgunEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  /** Used for From display name when MAILGUN_FROM_NAME is unset */
  restaurantDisplayName?: string;
};

export async function sendMailgunEmail(args: SendMailgunEmailArgs): Promise<void> {
  const key = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  if (!key || !domain) {
    throw new Error("Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN)");
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({ username: "api", key });

  const text = args.text?.trim() || htmlToPlainText(args.html);
  const from = resolveMailgunFromHeader(args.restaurantDisplayName);

  const payload: Record<string, unknown> = {
    from,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html: args.html,
    text,
  };

  if (args.cc) payload.cc = Array.isArray(args.cc) ? args.cc : [args.cc];
  if (args.bcc) payload.bcc = Array.isArray(args.bcc) ? args.bcc : [args.bcc];
  if (args.replyTo) payload["h:Reply-To"] = args.replyTo;

  await mg.messages.create(domain, payload as Parameters<typeof mg.messages.create>[1]);
  console.info("[mailgun] sent:", args.subject, "→", args.to);
}

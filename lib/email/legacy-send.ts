import { htmlToPlainText } from "@/lib/email/html-to-text";

export function isResendConfigured(): boolean {
  return (
    Boolean(process.env.RESEND_API_KEY?.trim()) &&
    process.env.EMAIL_PROVIDER?.trim().toLowerCase() === "resend"
  );
}

export function isSmtpConfigured(): boolean {
  if (process.env.EMAIL_PROVIDER?.trim().toLowerCase() !== "smtp") return false;
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS != null
  );
}

export function isLegacyEmailConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

export type LegacySendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
};

export async function sendLegacyTransactional(args: LegacySendArgs): Promise<void> {
  const text = args.text ?? htmlToPlainText(args.html);
  const from = process.env.ORDER_FROM_EMAIL?.trim() || process.env.MAILGUN_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error("ORDER_FROM_EMAIL or MAILGUN_FROM_EMAIL is required for Resend/SMTP");
  }

  if (isResendConfigured()) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        text,
        ...(args.cc ? { cc: [args.cc] } : {}),
        ...(args.bcc ? { bcc: [args.bcc] } : {}),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend HTTP ${res.status}: ${body}`);
    }
    console.info("[email] Resend:", args.subject);
    return;
  }

  if (isSmtpConfigured()) {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || "587");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transport.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo,
    });
    console.info("[email] SMTP:", args.subject);
    return;
  }

  throw new Error("EMAIL_PROVIDER is not set to resend or smtp, or SMTP variables are incomplete");
}

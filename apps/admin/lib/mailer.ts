import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";

/** Shop email over SMTP (a Hostinger mailbox; owner decision 2026-11-14). */
const cfg =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 465,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.MAIL_FROM ?? env.SMTP_USER,
      }
    : null;

export function mailEnabled(): boolean {
  return cfg !== null;
}

let transport: Transporter | null = null;

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  if (!cfg) throw new Error("SMTP is not configured");
  transport ??= nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transport.sendMail({ from: cfg.from, ...msg });
}

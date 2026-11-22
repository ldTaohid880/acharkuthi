"use server";

import { db, notifyAdmins, schema } from "@repo/db";
import { contactInput } from "@repo/validators";

export type ContactField = "name" | "email" | "phone" | "subject" | "message";

export interface ContactState {
  status: "idle" | "ok" | "fail" | "invalid";
  errors: Partial<Record<ContactField, string>>;
  /** Echoed back so the form keeps what the visitor typed. */
  values: Record<ContactField, string>;
}

const EMPTY: ContactState["values"] = { name: "", email: "", phone: "", subject: "", message: "" };

const text = (data: FormData, key: string) => {
  const v = data.get(key);
  return typeof v === "string" ? v : "";
};

export async function sendContactMessage(
  _prev: ContactState,
  data: FormData,
): Promise<ContactState> {
  const values: ContactState["values"] = {
    name: text(data, "name"),
    email: text(data, "email"),
    phone: text(data, "phone"),
    subject: text(data, "subject"),
    message: text(data, "message"),
  };

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (text(data, "website") !== "") return { status: "ok", errors: {}, values: EMPTY };

  const parsed = contactInput.safeParse(values);
  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as ContactField | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "invalid", errors, values };
  }

  try {
    await db.insert(schema.contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch (err) {
    console.error("contact message insert failed", err);
    return { status: "fail", errors: {}, values };
  }
  await notifyAdmins({
    kind: "message",
    subject: parsed.data.subject,
    name: parsed.data.name,
    excerpt: parsed.data.message.slice(0, 120),
  });
  return { status: "ok", errors: {}, values: EMPTY };
}

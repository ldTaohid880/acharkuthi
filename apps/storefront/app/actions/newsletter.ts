"use server";

import { db, schema } from "@repo/db";
import { newsletterInput } from "@repo/validators";

export interface NewsletterState {
  status: "idle" | "ok" | "invalid" | "fail";
  message: string;
  email: string;
}

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  data: FormData,
): Promise<NewsletterState> {
  const raw = data.get("email");
  const email = typeof raw === "string" ? raw : "";

  // Honeypot: real visitors never fill this in.
  if (data.get("website"))
    return { status: "ok", message: "Thank you, you're on the list.", email: "" };

  const parsed = newsletterInput.safeParse({ email });
  if (!parsed.success) {
    return {
      status: "invalid",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email",
      email,
    };
  }
  try {
    // A repeat sign-up is not an error: the visitor is already subscribed.
    await db
      .insert(schema.newsletterSubscribers)
      .values({ email: parsed.data.email.toLowerCase() })
      .onDuplicateKeyUpdate({ set: { email: parsed.data.email.toLowerCase() } });
  } catch (err) {
    console.error("newsletter signup failed", err);
    return { status: "fail", message: "We could not sign you up. Please try again.", email };
  }
  return { status: "ok", message: "Thank you, you're on the list.", email: "" };
}

import { db } from "./index";
import { adminNotifications, type NotificationData } from "./schema/admin";

/** Admin page each kind opens (routes from the admin canvas site map). */
function hrefFor(data: NotificationData, orderId?: number): string {
  switch (data.kind) {
    case "order":
    case "courier":
      return orderId ? `/orders/${orderId}` : "/orders";
    case "review":
      return "/reviews";
    case "message":
      return "/messages";
    case "restock":
      return "/restock-alerts";
    case "stock":
      return "/stock";
  }
}

/**
 * Adds an admin notification (top-bar bell). Best effort: a failure is logged and never breaks
 * the customer action that caused it, so call it after that action has been saved.
 */
export async function notifyAdmins(data: NotificationData, opts: { orderId?: number } = {}) {
  try {
    await db.insert(adminNotifications).values({
      kind: data.kind,
      href: hrefFor(data, opts.orderId),
      data,
    });
  } catch (err) {
    console.error("admin notification insert failed", err);
  }
}

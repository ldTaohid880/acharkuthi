"use server";

import { notificationIdInput, notificationListInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { getDict } from "@/lib/i18n/server";
import { listNotifications, markRead, unreadCount } from "@/lib/notifications";
import { requireAdmin } from "@/lib/require-admin";

/** The bell panel's list ("সব" / "না-পড়া" tab) and the unread count. */
export async function loadNotifications(input: unknown) {
  const { session, role } = await requireAdmin();
  const { filter } = notificationListInput.parse(input);
  const { lang, t } = await getDict();
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, role, filter, lang, t),
    unreadCount(session.user.id, role),
  ]);
  return { items, unread };
}

/** Opening a notification marks it read. */
export async function readNotification(input: unknown) {
  const { session, role } = await requireAdmin();
  const { id } = notificationIdInput.parse(input);
  await markRead(session.user.id, role, [id]);
  revalidatePath("/", "layout");
}

/** "সব পড়া হয়েছে". */
export async function readAllNotifications() {
  const { session, role } = await requireAdmin();
  await markRead(session.user.id, role, "all");
  revalidatePath("/", "layout");
}

// Admin back-office tables: the top-bar notifications (Notifications-*.dc.html).
import {
  bigint,
  foreignKey,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { ORDER_STATUSES, orders } from "./shop";

/**
 * order: new order · review: review waiting for approval · message: new contact message ·
 * courier: courier problem (Steadfast, later) · restock: stock is back for a size people asked
 * about · stock: a size just sold out.
 */
export const NOTIFICATION_KINDS = [
  "order",
  "review",
  "message",
  "courier",
  "restock",
  "stock",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds staff also see ("স্টাফ শুধু অর্ডার, স্টক ও মেসেজের নোটিফিকেশন পান"). */
export const STAFF_NOTIFICATION_KINDS: readonly NotificationKind[] = [
  "order",
  "courier",
  "stock",
  "message",
];

/** Bangla and English product name, copied when the notification is written. */
export interface NotifiedProduct {
  bn: string;
  en: string;
}

/** What each kind shows. Text is built at read time in the viewer's admin language. */
export type NotificationData =
  | { kind: "order"; orderNumber: string; name: string; total: number; items: number }
  | { kind: "review"; rating: number; name: string; product: NotifiedProduct | null }
  | { kind: "message"; subject: string; name: string; excerpt: string }
  | { kind: "courier"; orderNumber: string; courierStatus: string; note: string }
  | { kind: "restock"; product: NotifiedProduct; size: string; waiting: number }
  | { kind: "stock"; product: NotifiedProduct; size: string; requests: number };

export const adminNotifications = mysqlTable(
  "admin_notifications",
  {
    id: serial("id").primaryKey(),
    kind: mysqlEnum("kind", NOTIFICATION_KINDS).notNull(),
    /** Admin page the notification opens, e.g. /orders/42. */
    href: varchar("href", { length: 300 }).notNull(),
    data: json("data").$type<NotificationData>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("admin_notifications_created_idx").on(t.createdAt)],
);

/** One row per notification a user has read (opened, or "সব পড়া হয়েছে"). */
export const adminNotificationReads = mysqlTable(
  "admin_notification_reads",
  {
    notificationId: bigint("notification_id", { mode: "number", unsigned: true }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.notificationId, t.userId] }),
    // Named explicitly: the generated names pass MySQL's 64-character limit.
    foreignKey({
      name: "admin_notif_reads_notification_fk",
      columns: [t.notificationId],
      foreignColumns: [adminNotifications.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "admin_notif_reads_user_fk",
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    index("admin_notification_reads_user_idx").on(t.userId),
  ],
);

/**
 * One row per status change of an order (OrderDetail-* "স্ট্যাটাস টাইমলাইন"): when and by whom.
 * Written by the admin actions (confirm, pack, cancel, step back). Orders placed before this
 * table existed only have their creation time.
 */
export const orderStatusEvents = mysqlTable(
  "order_status_events",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
    status: mysqlEnum("status", ORDER_STATUSES).notNull(),
    /** Staff member who made the change; null if the account was removed. */
    userId: varchar("user_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("order_status_events_order_idx").on(t.orderId, t.createdAt),
    foreignKey({
      name: "order_status_events_order_fk",
      columns: [t.orderId],
      foreignColumns: [orders.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "order_status_events_user_fk",
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete("set null"),
  ],
);

/** "ভেতরের নোট": internal notes on an order. Customers never see these. */
export const orderNotes = mysqlTable(
  "order_notes",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
    userId: varchar("user_id", { length: 36 }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("order_notes_order_idx").on(t.orderId, t.createdAt),
    foreignKey({
      name: "order_notes_order_fk",
      columns: [t.orderId],
      foreignColumns: [orders.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "order_notes_user_fk",
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete("set null"),
  ],
);

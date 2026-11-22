// Admin back-office tables: the top-bar notifications (Notifications-*.dc.html).
import {
  bigint,
  boolean,
  foreignKey,
  index,
  int,
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
import { contactMessages } from "./contact";
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

/**
 * "দোকানের তথ্য" (Settings-* boards): one row (id 1). Printed as the sender on shipping labels
 * (OrderPrint-Desktop). Edited on the Settings page (A26).
 */
export const shopSettings = mysqlTable("shop_settings", {
  id: int("id").primaryKey(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  pickupAddress: text("pickup_address"),
  /**
   * "ডেলিভারি চার্জ" (paisa). Owner decision (2026-11-14): editable in Settings; checkout, order
   * tracking and the admin order screens read these. Defaults are the old fixed ৳60 / ৳120.
   */
  deliveryFeeIn: int("delivery_fee_in", { unsigned: true }).default(6000).notNull(),
  deliveryFeeOut: int("delivery_fee_out", { unsigned: true }).default(12000).notNull(),
  /** "ক্যাশ অন ডেলিভারি চালু": off stops checkout from taking orders. */
  codEnabled: boolean("cod_enabled").default(true).notNull(),
  /** Stock "সীমা": sizes below this count as low (Stock, Dashboard, menu badge). */
  lowStockLimit: int("low_stock_limit", { unsigned: true }).default(10).notNull(),
  /** Steadfast API keys and the webhook token, AES-256-GCM encrypted (lib/secret-box.ts). */
  steadfastApiKey: text("steadfast_api_key"),
  steadfastSecretKey: text("steadfast_secret_key"),
  steadfastWebhookToken: text("steadfast_webhook_token"),
  /** Paisa, from the last "সংযোগ পরীক্ষা". */
  steadfastBalance: int("steadfast_balance"),
  steadfastCheckedAt: timestamp("steadfast_checked_at"),
  /** Last webhook or status sync received. */
  steadfastSyncedAt: timestamp("steadfast_synced_at"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** "সাম্প্রতিক ইভেন্ট": every Steadfast webhook call that passed the token check (Settings). */
export const STEADFAST_EVENT_RESULTS = ["accepted", "no_order", "ignored"] as const;
export const steadfastEvents = mysqlTable(
  "steadfast_events",
  {
    id: serial("id").primaryKey(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    notificationType: varchar("notification_type", { length: 40 }),
    consignmentId: varchar("consignment_id", { length: 40 }),
    invoice: varchar("invoice", { length: 64 }),
    status: varchar("status", { length: 60 }),
    result: mysqlEnum("result", STEADFAST_EVENT_RESULTS).notNull(),
    orderId: bigint("order_id", { mode: "number", unsigned: true }),
    payload: json("payload"),
  },
  (t) => [
    index("steadfast_events_received_idx").on(t.receivedAt),
    foreignKey({
      name: "steadfast_events_order_fk",
      columns: [t.orderId],
      foreignColumns: [orders.id],
    }).onDelete("set null"),
  ],
);

/**
 * "নোট" on a customer (CustomerDetail-*.dc.html): internal notes, "শুধু অ্যাডমিন দেখে". Owner
 * decision (2026-11-14): stored like order notes, newest first, owner only.
 */
export const customerNotes = mysqlTable(
  "customer_notes",
  {
    id: serial("id").primaryKey(),
    customerId: varchar("customer_id", { length: 36 }).notNull(),
    authorId: varchar("author_id", { length: 36 }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("customer_notes_customer_idx").on(t.customerId, t.createdAt),
    foreignKey({
      name: "customer_notes_customer_fk",
      columns: [t.customerId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "customer_notes_author_fk",
      columns: [t.authorId],
      foreignColumns: [user.id],
    }).onDelete("set null"),
  ],
);

/**
 * Messages thread (Messages-* boards): "ইমেইলে উত্তর" replies, sent from the shop's address by the
 * server, and "ফোন নোট" notes for staff. Owner decision (2026-11-14), oldest first in the thread.
 */
export const MESSAGE_REPLY_KINDS = ["email", "note"] as const;
export const messageReplies = mysqlTable(
  "message_replies",
  {
    id: serial("id").primaryKey(),
    messageId: bigint("message_id", { mode: "number", unsigned: true }).notNull(),
    kind: mysqlEnum("kind", MESSAGE_REPLY_KINDS).notNull(),
    body: text("body").notNull(),
    authorId: varchar("author_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("message_replies_message_idx").on(t.messageId, t.createdAt),
    foreignKey({
      name: "message_replies_message_fk",
      columns: [t.messageId],
      foreignColumns: [contactMessages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "message_replies_author_fk",
      columns: [t.authorId],
      foreignColumns: [user.id],
    }).onDelete("set null"),
  ],
);

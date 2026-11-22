// Messages sent through the storefront Contact page, and newsletter sign-ups from the footer.
import {
  boolean,
  index,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const CONTACT_SUBJECTS = [
  "order",
  "delivery",
  "product",
  "refund",
  "feedback",
  "other",
] as const;

export const contactMessages = mysqlTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    subject: mysqlEnum("subject", CONTACT_SUBJECTS).notNull(),
    message: text("message").notNull(),
    /** Admin Messages: when someone opened it (null = unread). "না-পড়া করুন" clears it. */
    readAt: timestamp("read_at"),
    /** Admin Messages "আর্কাইভ": off the inbox, kept under the Archive tab. */
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("contact_messages_created_idx").on(t.createdAt),
    index("contact_messages_inbox_idx").on(t.archivedAt, t.createdAt),
  ],
);

export const newsletterSubscribers = mysqlTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(t.email)],
);

/** Overall-experience reviews for the shop as a whole (home page). Held for moderation until approved. */
export const siteReviews = mysqlTable(
  "site_reviews",
  {
    id: serial("id").primaryKey(),
    /** Null for a guest review. Lets the account page list a customer's own reviews. */
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    rating: tinyint("rating").notNull(),
    body: text("body").notNull(),
    isApproved: boolean("is_approved").default(false).notNull(),
    /** "আচারকুঠির উত্তর": the shop's public reply (Reviews-* boards), shown under the review. */
    reply: text("reply"),
    replyAt: timestamp("reply_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("site_reviews_approved_idx").on(t.isApproved, t.createdAt),
    index("site_reviews_user_idx").on(t.userId),
  ],
);

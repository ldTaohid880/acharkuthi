ALTER TABLE `site_reviews` ADD `reply` text;--> statement-breakpoint
ALTER TABLE `site_reviews` ADD `reply_at` timestamp;--> statement-breakpoint
ALTER TABLE `reviews` ADD `reply` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `reply_at` timestamp;
ALTER TABLE `orders` ADD `consignment_id` varchar(40);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_booked_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_status` varchar(40);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_synced_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `settled_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `payout_ref` varchar(80);--> statement-breakpoint
ALTER TABLE `product_variants` ADD `cost_price` int unsigned;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `low_stock_limit` int unsigned DEFAULT 10 NOT NULL;
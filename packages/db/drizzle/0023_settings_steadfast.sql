CREATE TABLE `steadfast_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	`notification_type` varchar(40),
	`consignment_id` varchar(40),
	`invoice` varchar(64),
	`status` varchar(60),
	`result` enum('accepted','no_order','ignored') NOT NULL,
	`order_id` bigint unsigned,
	`payload` json,
	CONSTRAINT `steadfast_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `delivery_fee_in` int unsigned DEFAULT 6000 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `delivery_fee_out` int unsigned DEFAULT 12000 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `cod_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_api_key` text;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_secret_key` text;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_webhook_token` text;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_balance` int;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_checked_at` timestamp;--> statement-breakpoint
ALTER TABLE `shop_settings` ADD `steadfast_synced_at` timestamp;--> statement-breakpoint
ALTER TABLE `steadfast_events` ADD CONSTRAINT `steadfast_events_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `steadfast_events_received_idx` ON `steadfast_events` (`received_at`);
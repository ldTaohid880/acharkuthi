CREATE TABLE `shop_settings` (
	`id` int NOT NULL,
	`phone` varchar(20),
	`email` varchar(255),
	`pickup_address` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_note` text;
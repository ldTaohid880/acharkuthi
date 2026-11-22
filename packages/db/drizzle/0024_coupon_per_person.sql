CREATE TABLE `coupon_attempts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`who` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`coupon_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned,
	`phone` varchar(20) NOT NULL,
	`user_id` varchar(36),
	`device_id` varchar(64),
	`fingerprint` varchar(64),
	`ip_hash` varchar(64),
	`source` varchar(10) NOT NULL DEFAULT 'web',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coupons` ADD `per_person_limit` int unsigned DEFAULT 1;--> statement-breakpoint
ALTER TABLE `coupons` ADD `max_discount` int unsigned;--> statement-breakpoint
ALTER TABLE `coupons` ADD `first_order_only` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coupon_attempts_who_idx` ON `coupon_attempts` (`who`,`created_at`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_phone_idx` ON `coupon_redemptions` (`coupon_id`,`phone`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_user_idx` ON `coupon_redemptions` (`coupon_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_device_idx` ON `coupon_redemptions` (`coupon_id`,`device_id`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_fp_idx` ON `coupon_redemptions` (`coupon_id`,`fingerprint`,`ip_hash`);
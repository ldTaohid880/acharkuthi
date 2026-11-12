CREATE TABLE `restock_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`variant_id` bigint unsigned NOT NULL,
	`contact` varchar(255) NOT NULL,
	`contact_kind` enum('phone','email') NOT NULL,
	`user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`notified_at` timestamp,
	CONSTRAINT `restock_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `restock_variant_contact_uq` UNIQUE(`variant_id`,`contact`)
);
--> statement-breakpoint
ALTER TABLE `restock_requests` ADD CONSTRAINT `restock_requests_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restock_requests` ADD CONSTRAINT `restock_requests_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `restock_notified_idx` ON `restock_requests` (`notified_at`,`created_at`);
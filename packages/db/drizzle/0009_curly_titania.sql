CREATE TABLE `recipes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(140) NOT NULL,
	`title` varchar(200) NOT NULL,
	`subtitle` varchar(240) NOT NULL,
	`summary` text,
	`category` enum('rice','snack','feast','new') NOT NULL,
	`total_minutes` int unsigned NOT NULL,
	`prep_minutes` int unsigned,
	`cook_minutes` int unsigned,
	`servings` tinyint unsigned,
	`difficulty` tinyint unsigned NOT NULL,
	`image_url` varchar(500),
	`image_file` varchar(160),
	`image_alt` varchar(300) NOT NULL DEFAULT '',
	`ingredients` json,
	`steps` json,
	`tips` json,
	`product_id` bigint unsigned,
	`is_sample` boolean NOT NULL DEFAULT false,
	`featured_order` tinyint unsigned,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`),
	CONSTRAINT `recipes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `recipes_category_idx` ON `recipes` (`category`);--> statement-breakpoint
CREATE INDEX `recipes_product_idx` ON `recipes` (`product_id`);
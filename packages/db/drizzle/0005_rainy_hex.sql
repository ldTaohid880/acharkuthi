ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_user_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `products` ADD `flavor` text;--> statement-breakpoint
ALTER TABLE `products` ADD `texture` text;--> statement-breakpoint
ALTER TABLE `products` ADD `serving` text;--> statement-breakpoint
ALTER TABLE `products` ADD `storage` text;--> statement-breakpoint
ALTER TABLE `products` ADD `shelf_life` text;--> statement-breakpoint
ALTER TABLE `products` ADD `allergens` text;--> statement-breakpoint
ALTER TABLE `products` ADD `packaging` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `name` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `title` varchar(120);--> statement-breakpoint
ALTER TABLE `reviews` ADD `spice` enum('low','ok','high');--> statement-breakpoint
ALTER TABLE `reviews` ADD `photo_url` varchar(300);--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
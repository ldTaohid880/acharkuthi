ALTER TABLE `categories` ADD `description_bn` text;--> statement-breakpoint
ALTER TABLE `product_images` ADD `alt_bn` varchar(200);--> statement-breakpoint
ALTER TABLE `products` ADD `description_bn` text;--> statement-breakpoint
ALTER TABLE `products` ADD `ingredients_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `flavor_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `texture_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `serving_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `storage_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `shelf_life_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `allergens_en` text;--> statement-breakpoint
ALTER TABLE `products` ADD `packaging_en` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `title_en` varchar(200);--> statement-breakpoint
ALTER TABLE `recipes` ADD `subtitle_bn` varchar(240);--> statement-breakpoint
ALTER TABLE `recipes` ADD `summary_en` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `image_alt_bn` varchar(300);
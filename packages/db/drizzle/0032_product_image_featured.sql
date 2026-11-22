ALTER TABLE `product_images` ADD `is_featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Owner 2026-11-22: the photos already made for Home's picks (named …-featured) start as featured.
UPDATE `product_images` SET `is_featured` = true WHERE `url` LIKE '%-featured.%';

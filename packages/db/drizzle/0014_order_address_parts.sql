ALTER TABLE `orders` ADD `ship_area` varchar(120);--> statement-breakpoint
ALTER TABLE `orders` ADD `ship_upazila` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `ship_district` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_zone` enum('in','out');--> statement-breakpoint
ALTER TABLE `orders` ADD `cancel_reason` enum('no_answer','customer_cancelled','duplicate','other');--> statement-breakpoint
ALTER TABLE `orders` ADD `cancel_note` text;--> statement-breakpoint
-- Backfill the zone for existing orders from the fee they paid (৳60 inside Dhaka, ৳120 outside).
UPDATE `orders` SET `delivery_zone` = CASE `shipping_fee` WHEN 6000 THEN 'in' WHEN 12000 THEN 'out' ELSE NULL END WHERE `delivery_zone` IS NULL;

ALTER TABLE `orders` ADD `courier_name` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_ref` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `eta_date` date;
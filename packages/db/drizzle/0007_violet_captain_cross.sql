ALTER TABLE `user` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `site_reviews` ADD `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `addresses` ADD `label` varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `addresses` ADD `division` varchar(80);--> statement-breakpoint
ALTER TABLE `site_reviews` ADD CONSTRAINT `site_reviews_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `site_reviews_user_idx` ON `site_reviews` (`user_id`);
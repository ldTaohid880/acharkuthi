CREATE TABLE `site_reviews` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`rating` tinyint NOT NULL,
	`body` text NOT NULL,
	`is_approved` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `site_reviews_approved_idx` ON `site_reviews` (`is_approved`,`created_at`);
CREATE TABLE `customer_notes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`author_id` varchar(36),
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_author_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `customer_notes_customer_idx` ON `customer_notes` (`customer_id`,`created_at`);
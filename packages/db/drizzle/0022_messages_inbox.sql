CREATE TABLE `message_replies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`message_id` bigint unsigned NOT NULL,
	`kind` enum('email','note') NOT NULL,
	`body` text NOT NULL,
	`author_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_messages` ADD `read_at` timestamp;--> statement-breakpoint
ALTER TABLE `contact_messages` ADD `archived_at` timestamp;--> statement-breakpoint
ALTER TABLE `message_replies` ADD CONSTRAINT `message_replies_message_fk` FOREIGN KEY (`message_id`) REFERENCES `contact_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_replies` ADD CONSTRAINT `message_replies_author_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `message_replies_message_idx` ON `message_replies` (`message_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `contact_messages_inbox_idx` ON `contact_messages` (`archived_at`,`created_at`);
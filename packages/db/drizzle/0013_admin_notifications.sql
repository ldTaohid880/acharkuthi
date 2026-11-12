CREATE TABLE `admin_notification_reads` (
	`notification_id` bigint unsigned NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`read_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_notification_reads_notification_id_user_id_pk` PRIMARY KEY(`notification_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_notifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`kind` enum('order','review','message','courier','restock','stock') NOT NULL,
	`href` varchar(300) NOT NULL,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_notification_reads` ADD CONSTRAINT `admin_notif_reads_notification_fk` FOREIGN KEY (`notification_id`) REFERENCES `admin_notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_notification_reads` ADD CONSTRAINT `admin_notif_reads_user_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_notification_reads_user_idx` ON `admin_notification_reads` (`user_id`);--> statement-breakpoint
CREATE INDEX `admin_notifications_created_idx` ON `admin_notifications` (`created_at`);
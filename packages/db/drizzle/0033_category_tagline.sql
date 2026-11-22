ALTER TABLE `categories` ADD `tagline` varchar(80);--> statement-breakpoint
ALTER TABLE `categories` ADD `tagline_bn` varchar(80);--> statement-breakpoint
UPDATE `categories` SET `tagline` = 'Raw mango', `tagline_bn` = 'কাঁচা আম' WHERE `slug` = 'mango' AND `tagline` IS NULL AND `tagline_bn` IS NULL;--> statement-breakpoint
UPDATE `categories` SET `tagline` = 'Gently sour', `tagline_bn` = 'হালকা টক' WHERE `slug` = 'lemon' AND `tagline` IS NULL AND `tagline_bn` IS NULL;--> statement-breakpoint
UPDATE `categories` SET `tagline` = 'Olive, tamarind, garlic', `tagline_bn` = 'জলপাই, তেঁতুল, রসুন' WHERE `slug` = 'special' AND `tagline` IS NULL AND `tagline_bn` IS NULL;--> statement-breakpoint
UPDATE `categories` SET `tagline` = 'A little of everything', `tagline_bn` = 'সব কিছুর একটু করে' WHERE `slug` = 'mixed' AND `tagline` IS NULL AND `tagline_bn` IS NULL;

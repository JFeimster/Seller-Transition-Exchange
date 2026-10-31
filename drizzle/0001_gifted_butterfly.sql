CREATE TABLE `buyers` (
	`buyer_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`buyer_type` text,
	`operating_experience` text,
	`acquisition_experience` text,
	`industries` text,
	`geography` text,
	`purchase_price_range` text,
	`available_equity_range` text,
	`financing_status` text,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`raw_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `buyer_id` integer;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `seller_id` integer;
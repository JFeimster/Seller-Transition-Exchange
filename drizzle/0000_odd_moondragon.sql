CREATE TABLE `businesses` (
	`business_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer,
	`legal_name` text,
	`public_name` text,
	`anonymous_name` text,
	`industry` text,
	`subindustry` text,
	`geography` text,
	`founded_year` text,
	`website` text,
	`employee_count` text,
	`owner_role` text,
	`revenue_range` text,
	`sde_range` text,
	`ebitda_range` text,
	`recurring_revenue_percentage` text,
	`customer_concentration` text,
	`real_estate_included` integer,
	`equipment_included` integer,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`raw_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`document_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer,
	`business_id` integer,
	`category` text,
	`title` text,
	`confidentiality_level` text,
	`verification_status` text DEFAULT 'draft' NOT NULL,
	`storage_reference` text,
	`content` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `financing_requests` (
	`financing_request_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` integer,
	`listing_id` integer,
	`buyer_id` integer,
	`purchase_price` text,
	`buyer_equity` text,
	`seller_note` text,
	`working_capital` text,
	`equipment_amount` text,
	`buyer_experience` text,
	`desired_closing_date` text,
	`status` text DEFAULT 'New' NOT NULL,
	`raw_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`inquiry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_slug` text,
	`buyer_name` text,
	`buyer_email` text,
	`buyer_type` text,
	`status` text DEFAULT 'New' NOT NULL,
	`reason_for_interest` text,
	`financing_help_requested` integer,
	`disclosure_approved` integer DEFAULT false NOT NULL,
	`raw_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`listing_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` integer,
	`title` text,
	`slug` text,
	`visibility_level` text,
	`listing_status` text DEFAULT 'Draft' NOT NULL,
	`asking_price` text,
	`transaction_type` text,
	`seller_financing_available` text,
	`rollover_equity_available` text,
	`transition_support` text,
	`summary` text,
	`highlights` text,
	`growth_opportunities` text,
	`desired_buyer` text,
	`published_at` text,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `readiness_assessments` (
	`assessment_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer,
	`business_id` integer,
	`total_score` integer,
	`category` text,
	`component_scores` text,
	`value_suppressors` text,
	`risks` text,
	`recommended_actions` text,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`seller_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`full_name` text,
	`email` text,
	`phone` text,
	`location` text,
	`preferred_contact` text,
	`transition_goal` text,
	`target_timeline` text,
	`confidentiality_preference` text,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`raw_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `digital_marketplace_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_listing_id` text NOT NULL,
	`source_classification` text DEFAULT 'syndicated_external' NOT NULL,
	`listing_number` text NOT NULL,
	`monetization` text,
	`niche` text,
	`listing_status` text,
	`asking_price` text,
	`average_monthly_net_profit` text,
	`average_monthly_gross_revenue` text,
	`monthly_recurring_revenue` text,
	`listing_multiple` text,
	`business_age` text,
	`owner_hours_per_week` text,
	`financing_indicator` integer,
	`canonical_destination` text,
	`first_listed_at` text,
	`last_updated_at` text,
	`retrieved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`stale` integer DEFAULT false NOT NULL,
	`public_visibility` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `digital_outbound_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_kind` text NOT NULL,
	`listing_number` text,
	`destination_classification` text NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `digital_valuation_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valuation_session_id` text NOT NULL,
	`user_id` text,
	`business_id` integer,
	`monetization` text,
	`submitted_inputs` text,
	`estimate_range` text,
	`suggested_listing_estimate` text,
	`valuation_basis` text,
	`evidence_classification` text DEFAULT 'Third-Party Marketplace Data' NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`consent_status` text DEFAULT 'not_requested' NOT NULL,
	`retention_status` text DEFAULT 'session_only' NOT NULL
);

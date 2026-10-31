CREATE TABLE `advisor_assignments` (
	`assignment_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`advisor_id` integer NOT NULL,
	`seller_id` integer,
	`business_id` integer,
	`transition_plan_id` integer,
	`financing_request_id` integer,
	`mandate_id` integer,
	`role` text NOT NULL,
	`approved_scope` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'Suggested' NOT NULL,
	`access_expiration` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `advisors` (
	`advisor_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`public_display_name` text,
	`legal_name` text,
	`firm_name` text,
	`primary_category` text,
	`additional_categories` text DEFAULT '[]' NOT NULL,
	`public_bio` text,
	`private_admin_notes` text,
	`geographies` text DEFAULT '[]' NOT NULL,
	`industries` text DEFAULT '[]' NOT NULL,
	`transition_paths` text DEFAULT '[]' NOT NULL,
	`transaction_size_range` text,
	`services` text DEFAULT '[]' NOT NULL,
	`credentials` text DEFAULT '[]' NOT NULL,
	`credential_sources` text DEFAULT '[]' NOT NULL,
	`license_fields` text DEFAULT '{}' NOT NULL,
	`compensation_model` text,
	`conflicts` text DEFAULT '[]' NOT NULL,
	`sponsored_status` text DEFAULT 'Not Sponsored' NOT NULL,
	`verification_status` text DEFAULT 'Profile Incomplete' NOT NULL,
	`source` text DEFAULT 'Advisor Submitted' NOT NULL,
	`last_verified` text,
	`confidence` text DEFAULT 'Missing' NOT NULL,
	`public_visibility` integer DEFAULT false NOT NULL,
	`introduction_availability` text DEFAULT 'Request Review' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`raw_payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`registration_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`attendee_type` text,
	`consent_status` text DEFAULT 'Recorded' NOT NULL,
	`status` text DEFAULT 'Registration Recorded' NOT NULL,
	`external_confirmation_status` text DEFAULT 'Pending External Delivery' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `introduction_requests` (
	`introduction_request_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_id` text NOT NULL,
	`recipient_id` text,
	`seller_id` integer,
	`business_id` integer,
	`listing_id` integer,
	`mandate_id` integer,
	`buyer_id` integer,
	`advisor_id` integer,
	`financing_request_id` integer,
	`transition_plan_id` integer,
	`purpose` text NOT NULL,
	`approved_summary` text DEFAULT '' NOT NULL,
	`approved_material_ids` text DEFAULT '[]' NOT NULL,
	`approved_information_tier` text DEFAULT 'Restricted Teaser' NOT NULL,
	`conditions` text DEFAULT '{}' NOT NULL,
	`consent_status` text DEFAULT 'Not Started' NOT NULL,
	`status` text DEFAULT 'Requested' NOT NULL,
	`expiration` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `network_audit_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`approved_scope` text,
	`reason` text,
	`evidence_classification` text DEFAULT 'System Event' NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `network_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` text NOT NULL,
	`regional_market_id` integer,
	`industry` text,
	`transition_path` text,
	`host_id` text,
	`host_verification` text DEFAULT 'Submitted' NOT NULL,
	`start_at` text,
	`end_at` text,
	`timezone` text,
	`location_type` text,
	`public_location` text,
	`private_access_details` text,
	`registration_status` text DEFAULT 'Not Open' NOT NULL,
	`capacity` integer,
	`registration_count` integer,
	`source` text DEFAULT 'Submitted' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`public_visibility` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `regional_markets` (
	`regional_market_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`parent_region` text,
	`geography` text,
	`public_description` text,
	`source_classification` text DEFAULT 'Editorial Structure' NOT NULL,
	`review_status` text DEFAULT 'Needs Review' NOT NULL,
	`public_visibility` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regional_markets_slug_unique` ON `regional_markets` (`slug`);--> statement-breakpoint
CREATE TABLE `seller_buyer_shortlists` (
	`shortlist_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`buyer_id` integer NOT NULL,
	`business_id` integer,
	`status` text DEFAULT 'Private Shortlist' NOT NULL,
	`internal_notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

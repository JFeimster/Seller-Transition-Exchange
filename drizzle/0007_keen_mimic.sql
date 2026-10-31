CREATE TABLE `deal_room_access_grants` (
	`access_grant_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_room_id` integer NOT NULL,
	`buyer_id` integer,
	`buyer_profile_id` integer NOT NULL,
	`disclosure_id` integer NOT NULL,
	`granted_by_user_id` text NOT NULL,
	`item_scope` text DEFAULT '[]' NOT NULL,
	`purpose` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`reason` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deal_room_audit_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_room_id` integer,
	`actor_user_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`reason` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deal_room_items` (
	`deal_room_item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_room_id` integer NOT NULL,
	`document_id` integer,
	`generated_material_id` integer,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`confidentiality_level` text DEFAULT 'Restricted' NOT NULL,
	`evidence_status` text DEFAULT 'Missing' NOT NULL,
	`review_status` text DEFAULT 'Needs Review' NOT NULL,
	`upload_status` text DEFAULT 'Awaiting Secure Upload' NOT NULL,
	`access_enabled` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deal_rooms` (
	`deal_room_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`listing_id` integer,
	`mandate_id` integer,
	`transition_plan_id` integer,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'Preparing Index' NOT NULL,
	`confidentiality_level` text DEFAULT 'Private' NOT NULL,
	`access_mode` text DEFAULT 'Seller Approved · Item Scope' NOT NULL,
	`default_expiry_days` integer DEFAULT 14 NOT NULL,
	`storage_status` text DEFAULT 'Secure Storage Pending Integration' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_material_audit_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`generated_material_id` integer,
	`actor_user_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`reason` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_materials` (
	`generated_material_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`listing_id` integer,
	`mandate_id` integer,
	`transition_plan_id` integer,
	`financing_request_id` integer,
	`owner_user_id` text NOT NULL,
	`material_type` text NOT NULL,
	`title` text NOT NULL,
	`audience` text DEFAULT 'Seller Only' NOT NULL,
	`visibility_level` text DEFAULT 'Seller Only' NOT NULL,
	`draft_status` text DEFAULT 'Draft' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`claim_manifest` text DEFAULT '[]' NOT NULL,
	`source_entity_ids` text DEFAULT '{}' NOT NULL,
	`source_versions` text DEFAULT '{}' NOT NULL,
	`confidentiality_review` text DEFAULT '{}' NOT NULL,
	`unsupported_claims` text DEFAULT '[]' NOT NULL,
	`seller_approval` text DEFAULT 'Not Started' NOT NULL,
	`admin_approval` text DEFAULT 'Not Started' NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`generated_by` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `quiet_exit_audit_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer,
	`actor_user_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`reason` text,
	`evidence_classification` text DEFAULT 'System Event' NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_buyer_profiles` (
	`profile_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`buyer_id` integer,
	`user_id` text NOT NULL,
	`buyer_name` text,
	`organization` text,
	`buyer_type` text,
	`industries` text,
	`geography` text,
	`operating_experience` text,
	`acquisition_experience` text,
	`available_equity` text,
	`financing_status` text,
	`transition_approach` text,
	`confidentiality_acknowledged` integer DEFAULT false NOT NULL,
	`identity_status` text DEFAULT 'Submitted' NOT NULL,
	`capacity_status` text DEFAULT 'Buyer Provided' NOT NULL,
	`verification_status` text DEFAULT 'Submitted' NOT NULL,
	`consent_status` text DEFAULT 'Not Started' NOT NULL,
	`raw_payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_disclosures` (
	`disclosure_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer NOT NULL,
	`inquiry_id` integer NOT NULL,
	`buyer_profile_id` integer NOT NULL,
	`requested_tier` text DEFAULT 'Restricted Teaser' NOT NULL,
	`approved_tier` text,
	`decision_status` text DEFAULT 'Requested' NOT NULL,
	`decision_reason` text,
	`conditions` text,
	`expires_at` text,
	`revoked_at` text,
	`seller_approved_at` text,
	`admin_approved_at` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_inquiry_reviews` (
	`review_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inquiry_id` integer NOT NULL,
	`mandate_id` integer NOT NULL,
	`buyer_profile_id` integer NOT NULL,
	`match_classification` text DEFAULT 'Needs Information' NOT NULL,
	`match_score` integer,
	`hard_conflicts` text DEFAULT '[]' NOT NULL,
	`alignment` text DEFAULT '[]' NOT NULL,
	`missing_information` text DEFAULT '[]' NOT NULL,
	`seller_review_status` text DEFAULT 'New' NOT NULL,
	`admin_review_status` text DEFAULT 'Not Started' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_invitations` (
	`invitation_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer NOT NULL,
	`invited_buyer_email` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`status` text DEFAULT 'Prepared' NOT NULL,
	`expires_at` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_mandates` (
	`mandate_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`native_listing_id` integer,
	`owner_user_id` text NOT NULL,
	`objective` text DEFAULT 'Explore a confidential transition' NOT NULL,
	`confidentiality_level` text DEFAULT 'Anonymous Teaser' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`teaser_status` text DEFAULT 'Not Started' NOT NULL,
	`identification_risk` text DEFAULT 'Needs Review' NOT NULL,
	`public_safe_profile` text DEFAULT '{}' NOT NULL,
	`known_identifiers_private` text DEFAULT '{}' NOT NULL,
	`buyer_requirements` text DEFAULT '{}' NOT NULL,
	`seller_exclusions` text DEFAULT '{}' NOT NULL,
	`seller_approved_at` text,
	`admin_review_status` text DEFAULT 'Not Started' NOT NULL,
	`admin_approved_at` text,
	`next_action` text DEFAULT 'Define the confidentiality perimeter' NOT NULL,
	`original_payload` text DEFAULT '{}' NOT NULL,
	`canonical_payload` text DEFAULT '{}' NOT NULL,
	`evidence_classification` text DEFAULT 'Seller Provided' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiet_exit_materials` (
	`material_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer NOT NULL,
	`material_type` text NOT NULL,
	`source_record_ids` text DEFAULT '[]' NOT NULL,
	`source_versions` text DEFAULT '{}' NOT NULL,
	`visibility` text DEFAULT 'Seller Only' NOT NULL,
	`private_content` text DEFAULT '{}' NOT NULL,
	`public_content` text DEFAULT '{}' NOT NULL,
	`redaction_log` text DEFAULT '[]' NOT NULL,
	`risk_report` text DEFAULT '{}' NOT NULL,
	`seller_review_status` text DEFAULT 'Needs Review' NOT NULL,
	`admin_review_status` text DEFAULT 'Not Started' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `capital_structure_scenarios` (
	`scenario_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`financing_request_id` integer NOT NULL,
	`scenario_type` text NOT NULL,
	`sources_uses` text DEFAULT '{}' NOT NULL,
	`assumptions` text DEFAULT '[]' NOT NULL,
	`risks` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'Preliminary' NOT NULL,
	`evidence_classification` text DEFAULT 'Buyer Provided' NOT NULL,
	`next_action` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `financing_audit_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`financing_request_id` integer,
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
CREATE TABLE `financing_readiness_reviews` (
	`review_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`financing_request_id` integer NOT NULL,
	`total_score` integer,
	`classification` text DEFAULT 'Incomplete' NOT NULL,
	`component_scores` text DEFAULT '{}' NOT NULL,
	`evidence_classification` text DEFAULT 'Missing' NOT NULL,
	`methodology` text DEFAULT '{}' NOT NULL,
	`missing_components` text DEFAULT '[]' NOT NULL,
	`conflicts` text DEFAULT '[]' NOT NULL,
	`manual_overrides` text DEFAULT '[]' NOT NULL,
	`application_state` text DEFAULT 'Preliminary' NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `funding_partners` (
	`funding_partner_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`partner_type` text,
	`geography` text,
	`criteria` text DEFAULT '[]' NOT NULL,
	`verification_status` text DEFAULT 'Submitted' NOT NULL,
	`source_reference` text,
	`last_reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routing_decisions` (
	`routing_decision_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`financing_request_id` integer NOT NULL,
	`funding_partner_id` integer,
	`decision` text DEFAULT 'Needs Review' NOT NULL,
	`approved_scope` text DEFAULT '[]' NOT NULL,
	`consent_status` text DEFAULT 'Not Started' NOT NULL,
	`reason` text,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `seller_id` integer;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `mandate_id` integer;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `inquiry_id` integer;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `transition_plan_id` integer;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `transaction_path` text;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `evidence_classification` text DEFAULT 'Buyer Provided' NOT NULL;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `consent_status` text DEFAULT 'Not Started' NOT NULL;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `documentation_status` text DEFAULT 'Missing' NOT NULL;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `capital_needs` text DEFAULT '{}' NOT NULL;
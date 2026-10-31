CREATE TABLE `transition_action_items` (
	`action_item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`stage` text NOT NULL,
	`title` text NOT NULL,
	`module` text NOT NULL,
	`route` text NOT NULL,
	`priority` integer DEFAULT 99 NOT NULL,
	`status` text DEFAULT 'Not Started' NOT NULL,
	`evidence_status` text DEFAULT 'Missing' NOT NULL,
	`required_input` text,
	`source_lineage` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transition_actions_seller_idx` ON `transition_action_items` (`seller_id`);--> statement-breakpoint
CREATE INDEX `transition_actions_owner_idx` ON `transition_action_items` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `transition_actions_status_idx` ON `transition_action_items` (`status`);--> statement-breakpoint
CREATE INDEX `transition_actions_stage_idx` ON `transition_action_items` (`stage`);--> statement-breakpoint
CREATE TABLE `transition_activity` (
	`activity_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer,
	`business_id` integer,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`summary` text NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transition_activity_seller_idx` ON `transition_activity` (`seller_id`);--> statement-breakpoint
CREATE INDEX `transition_activity_business_idx` ON `transition_activity` (`business_id`);--> statement-breakpoint
CREATE INDEX `transition_activity_created_idx` ON `transition_activity` (`created_at`);--> statement-breakpoint
CREATE TABLE `transition_evidence_reviews` (
	`evidence_review_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_path` text NOT NULL,
	`evidence_status` text DEFAULT 'Missing' NOT NULL,
	`source_lineage` text DEFAULT '{}' NOT NULL,
	`review_status` text DEFAULT 'Needs Review' NOT NULL,
	`reviewer_id` text,
	`reviewer_notes` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transition_evidence_seller_idx` ON `transition_evidence_reviews` (`seller_id`);--> statement-breakpoint
CREATE INDEX `transition_evidence_owner_idx` ON `transition_evidence_reviews` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `transition_evidence_review_idx` ON `transition_evidence_reviews` (`review_status`);--> statement-breakpoint
CREATE INDEX `transition_evidence_status_idx` ON `transition_evidence_reviews` (`evidence_status`);--> statement-breakpoint
CREATE TABLE `transition_workflow_checkpoints` (
	`checkpoint_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`stage` text NOT NULL,
	`status` text DEFAULT 'Not Started' NOT NULL,
	`completed_items` text DEFAULT '[]' NOT NULL,
	`missing_items` text DEFAULT '[]' NOT NULL,
	`next_milestone` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transition_checkpoints_seller_idx` ON `transition_workflow_checkpoints` (`seller_id`);--> statement-breakpoint
CREATE INDEX `transition_checkpoints_owner_idx` ON `transition_workflow_checkpoints` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `transition_checkpoints_stage_idx` ON `transition_workflow_checkpoints` (`stage`);
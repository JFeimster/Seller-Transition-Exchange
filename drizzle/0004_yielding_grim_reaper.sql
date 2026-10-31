CREATE TABLE `quiet_exit_rate_limits` (
	`rate_key` text PRIMARY KEY NOT NULL,
	`principal` text NOT NULL,
	`window_started_at` text NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

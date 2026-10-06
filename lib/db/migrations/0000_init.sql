CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_ix` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`kind` text NOT NULL,
	`body` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "activities_kind_check" CHECK("activities"."kind" in ('ligacao', 'email', 'whatsapp', 'dm', 'visita', 'nota', 'stage_change'))
);
--> statement-breakpoint
CREATE INDEX `activities_lead_ix` ON `activities` (`lead_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `lead_searches` (
	`lead_id` integer NOT NULL,
	`search_id` integer NOT NULL,
	`was_new` integer NOT NULL,
	PRIMARY KEY(`lead_id`, `search_id`),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`place_id` text,
	`name` text NOT NULL,
	`formatted_address` text,
	`lat` real,
	`lng` real,
	`phone` text,
	`website_uri` text,
	`rating` real,
	`user_rating_count` integer,
	`business_status` text,
	`primary_type` text,
	`primary_type_display` text,
	`google_maps_uri` text,
	`raw_json` text,
	`captured_at` text NOT NULL,
	`temperature` text NOT NULL,
	`stage_id` integer,
	`verification` text DEFAULT 'pendente' NOT NULL,
	`disqualify_reason` text,
	`verified_by` text,
	`verified_at` text,
	`contact_name` text,
	`email` text,
	`instagram` text,
	`whatsapp` text,
	`notes` text,
	`next_action` text,
	`next_action_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "leads_temperature_check" CHECK("leads"."temperature" in ('quente', 'morno', 'frio')),
	CONSTRAINT "leads_verification_check" CHECK("leads"."verification" in ('pendente', 'qualificado', 'descartado')),
	CONSTRAINT "leads_verified_by_check" CHECK("leads"."verified_by" is null or "leads"."verified_by" in ('manual', 'ai'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_user_place_ux` ON `leads` (`user_id`,`place_id`);--> statement-breakpoint
CREATE INDEX `leads_user_updated_ix` ON `leads` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `leads_user_temperature_ix` ON `leads` (`user_id`,`temperature`);--> statement-breakpoint
CREATE INDEX `leads_user_verification_ix` ON `leads` (`user_id`,`verification`);--> statement-breakpoint
CREATE INDEX `leads_stage_ix` ON `leads` (`stage_id`);--> statement-breakpoint
CREATE INDEX `leads_user_next_action_ix` ON `leads` (`user_id`,`next_action_at`);--> statement-breakpoint
CREATE TABLE `search_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`text_query` text NOT NULL,
	`included_type` text,
	`min_rating` real,
	`filters_json` text NOT NULL,
	`max_pages` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`preset_id` integer,
	`text_query` text NOT NULL,
	`included_type` text,
	`min_rating` real,
	`filters_json` text NOT NULL,
	`pages_fetched` integer DEFAULT 0 NOT NULL,
	`api_requests` integer DEFAULT 0 NOT NULL,
	`raw_count` integer DEFAULT 0 NOT NULL,
	`new_count` integer DEFAULT 0 NOT NULL,
	`executed_at` text NOT NULL,
	`error` text,
	`is_sample` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preset_id`) REFERENCES `search_presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `searches_user_executed_ix` ON `searches` (`user_id`,`executed_at`);--> statement-breakpoint
CREATE INDEX `searches_executed_ix` ON `searches` (`executed_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_ix` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`color` text,
	`kind` text DEFAULT 'open' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stages_kind_check" CHECK("stages"."kind" in ('open', 'won', 'lost'))
);
--> statement-breakpoint
CREATE INDEX `stages_user_ix` ON `stages` (`user_id`,`position`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_ix` ON `verification` (`identifier`);
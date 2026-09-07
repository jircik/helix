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
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "leads_temperature_check" CHECK("leads"."temperature" in ('quente', 'morno', 'frio')),
	CONSTRAINT "leads_verification_check" CHECK("leads"."verification" in ('pendente', 'qualificado', 'descartado')),
	CONSTRAINT "leads_verified_by_check" CHECK("leads"."verified_by" is null or "leads"."verified_by" in ('manual', 'ai'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_place_id_ux` ON `leads` (`place_id`);--> statement-breakpoint
CREATE INDEX `leads_temperature_ix` ON `leads` (`temperature`);--> statement-breakpoint
CREATE INDEX `leads_verification_ix` ON `leads` (`verification`);--> statement-breakpoint
CREATE INDEX `leads_stage_ix` ON `leads` (`stage_id`);--> statement-breakpoint
CREATE INDEX `leads_next_action_ix` ON `leads` (`next_action_at`);--> statement-breakpoint
CREATE TABLE `search_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`text_query` text NOT NULL,
	`included_type` text,
	`min_rating` real,
	`filters_json` text NOT NULL,
	`max_pages` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	FOREIGN KEY (`preset_id`) REFERENCES `search_presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`color` text,
	`kind` text DEFAULT 'open' NOT NULL,
	CONSTRAINT "stages_kind_check" CHECK("stages"."kind" in ('open', 'won', 'lost'))
);

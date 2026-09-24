CREATE SCHEMA "logs";
--> statement-breakpoint
CREATE TABLE "logs"."entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	"level" text NOT NULL,
	"app" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "entries_logged_at_idx" ON "logs"."entries" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX "entries_app_level_logged_at_idx" ON "logs"."entries" USING btree ("app","level","logged_at");
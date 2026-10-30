CREATE SCHEMA "raw_disaster";
--> statement-breakpoint
CREATE TABLE "raw_disaster"."fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"http_status" integer,
	"success" boolean NOT NULL,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_inserted" integer DEFAULT 0 NOT NULL,
	"items_duplicate" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_disaster"."items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"hazard_type" text NOT NULL,
	"title" text NOT NULL,
	"place" text,
	"latitude" double precision,
	"longitude" double precision,
	"depth_km" double precision,
	"magnitude" double precision,
	"magnitude_type" text,
	"source_status" text,
	"source_alert_level" text,
	"tsunami_flag" boolean,
	"significance" integer,
	"felt_reports" integer,
	"url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_hash" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_disaster"."sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"source_type" text NOT NULL,
	"url" text NOT NULL,
	"query_params" jsonb NOT NULL,
	"license" text NOT NULL,
	"attribution" text,
	"terms_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "raw_disaster"."fetches" ADD CONSTRAINT "fetches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "raw_disaster"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_disaster"."items" ADD CONSTRAINT "items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "raw_disaster"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "items_source_id_external_id_updated_key" ON "raw_disaster"."items" USING btree ("source_id","external_id","source_updated_at");--> statement-breakpoint
CREATE INDEX "items_occurred_at_idx" ON "raw_disaster"."items" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "items_source_id_external_id_idx" ON "raw_disaster"."items" USING btree ("source_id","external_id");
CREATE TABLE "app"."auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	"accept_language" text,
	"country" text,
	"region" text,
	"region_code" text,
	"city" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text,
	"continent" text,
	"asn" integer,
	"as_organization" text,
	"colo" text,
	"cf" jsonb,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"page_views" integer DEFAULT 1 NOT NULL,
	"landing_path" text NOT NULL,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"ip" text,
	"user_agent" text,
	"accept_language" text,
	"country" text,
	"region" text,
	"region_code" text,
	"city" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text,
	"continent" text,
	"asn" integer,
	"as_organization" text,
	"colo" text,
	"cf" jsonb
);
--> statement-breakpoint
CREATE TABLE "app"."visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"consent_version" text NOT NULL,
	"consent_given_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."visitor_sessions" ADD CONSTRAINT "visitor_sessions_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "app"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."visitors" ADD CONSTRAINT "visitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "app"."auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_visitor_id_last_seen_at_idx" ON "app"."visitor_sessions" USING btree ("visitor_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_started_at_idx" ON "app"."visitor_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_utm_campaign_idx" ON "app"."visitor_sessions" USING btree ("utm_campaign");
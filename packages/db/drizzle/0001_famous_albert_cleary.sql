CREATE SCHEMA "raw_weather";
--> statement-breakpoint
CREATE TABLE "raw_weather"."air_quality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"pm10" double precision,
	"pm2_5" double precision,
	"carbon_monoxide" double precision,
	"nitrogen_dioxide" double precision,
	"sulphur_dioxide" double precision,
	"ozone" double precision,
	"us_aqi" integer,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."climate_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"model" text NOT NULL,
	"date" date NOT NULL,
	"temperature_max_c" double precision,
	"temperature_min_c" double precision,
	"precipitation_sum_mm" double precision,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "climate_projections_location_model_date_key" UNIQUE("location_id","model","date")
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"data_type" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"http_status" integer,
	"success" boolean NOT NULL,
	"records_found" integer DEFAULT 0 NOT NULL,
	"records_inserted" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."flood_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"river_discharge_m3s" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"weather_code" integer,
	"temperature_max_c" double precision,
	"temperature_min_c" double precision,
	"precipitation_sum_mm" double precision,
	"precipitation_probability_pct" double precision,
	"wind_speed_max_kmh" double precision,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"elevation_m" double precision,
	"tags" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."marine_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"wave_height_m" double precision,
	"wave_direction_deg" double precision,
	"wave_period_s" double precision,
	"daily_wave_height_max" jsonb NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"temperature_c" double precision,
	"relative_humidity_pct" double precision,
	"apparent_temperature_c" double precision,
	"precipitation_mm" double precision,
	"weather_code" integer,
	"wind_speed_kmh" double precision,
	"wind_direction_deg" double precision,
	"surface_pressure_hpa" double precision,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_weather"."seasonal_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"forecast_days" integer NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "raw_weather"."air_quality" ADD CONSTRAINT "air_quality_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."air_quality" ADD CONSTRAINT "air_quality_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."climate_projections" ADD CONSTRAINT "climate_projections_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."fetches" ADD CONSTRAINT "fetches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."flood_forecasts" ADD CONSTRAINT "flood_forecasts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."flood_forecasts" ADD CONSTRAINT "flood_forecasts_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."forecasts" ADD CONSTRAINT "forecasts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."forecasts" ADD CONSTRAINT "forecasts_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."marine_forecasts" ADD CONSTRAINT "marine_forecasts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."marine_forecasts" ADD CONSTRAINT "marine_forecasts_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."observations" ADD CONSTRAINT "observations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."observations" ADD CONSTRAINT "observations_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."seasonal_forecasts" ADD CONSTRAINT "seasonal_forecasts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "raw_weather"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_weather"."seasonal_forecasts" ADD CONSTRAINT "seasonal_forecasts_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "raw_weather"."fetches"("id") ON DELETE no action ON UPDATE no action;
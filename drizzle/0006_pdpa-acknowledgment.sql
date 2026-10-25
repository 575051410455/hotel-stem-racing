ALTER TABLE "registrations" ADD COLUMN "pdpa_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "pdpa_notice_version" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "pdpa_policy_url" text;
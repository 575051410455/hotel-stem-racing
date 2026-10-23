ALTER TABLE "users" ADD COLUMN "kind" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kind_check" CHECK ("users"."kind" in ('staff', 'kiosk'));
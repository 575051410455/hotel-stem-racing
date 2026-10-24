ALTER TABLE "users" DROP CONSTRAINT "users_kind_check";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kind_check" CHECK ("users"."kind" in ('admin', 'staff', 'kiosk'));
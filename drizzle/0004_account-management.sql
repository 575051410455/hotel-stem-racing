ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_signed_in_at" timestamp with time zone;--> statement-breakpoint
-- Backfill (account-management ticket 03): each Account that has a session starts with the time of
-- its newest one. Better Auth deletes a session on sign-out, so the rest stay null ("Never").
UPDATE "users" SET "last_signed_in_at" = "newest"."created_at"
FROM (SELECT "user_id", max("created_at") AS "created_at" FROM "sessions" GROUP BY "user_id") AS "newest"
WHERE "newest"."user_id" = "users"."id";

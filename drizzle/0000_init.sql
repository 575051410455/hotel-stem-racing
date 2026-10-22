CREATE TYPE "public"."attendee_role" AS ENUM('parent', 'teacher', 'student', 'sponsor', 'other');--> statement-breakpoint
CREATE TYPE "public"."referral_source" AS ENUM('facebook', 'instagram', 'tiktok', 'line', 'website', 'school', 'organisation', 'friend', 'competing_team', 'other');--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "check_ins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"registration_id" integer NOT NULL,
	"event_day" date NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"staff_account_id" text,
	"outside_registered_day" boolean DEFAULT false NOT NULL,
	CONSTRAINT "check_ins_registrationId_eventDay_unique" UNIQUE("registration_id","event_day")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "registrations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token" uuid NOT NULL,
	"pass_code" text NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"duplicate_key" text NOT NULL,
	"role" "attendee_role" NOT NULL,
	"role_other" text,
	"organisation" text,
	"event_days" date[] NOT NULL,
	"referral_sources" "referral_source"[] NOT NULL,
	"referral_other" text,
	"competing_team_cheered_for" text,
	"accessibility_needs" text,
	"comments" text,
	"email_sent_count" integer DEFAULT 0 NOT NULL,
	"last_email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_token_unique" UNIQUE("token"),
	CONSTRAINT "registrations_passCode_unique" UNIQUE("pass_code"),
	CONSTRAINT "registrations_duplicateKey_unique" UNIQUE("duplicate_key")
);
--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registrations_created_at_index" ON "registrations" USING btree ("created_at");
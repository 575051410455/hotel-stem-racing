CREATE TABLE "account_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"actor_account_id" text,
	"action" text NOT NULL,
	"details" jsonb,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_changes_action_check" CHECK ("account_changes"."action" in ('created', 'name-changed', 'email-changed', 'kind-changed', 'password-set', 'password-changed', 'disabled', 'enabled'))
);
--> statement-breakpoint
ALTER TABLE "account_changes" ADD CONSTRAINT "account_changes_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_changes" ADD CONSTRAINT "account_changes_actor_account_id_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_changes_account_id_changed_at_index" ON "account_changes" USING btree ("account_id","changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "account_changes_changed_at_index" ON "account_changes" USING btree ("changed_at" DESC NULLS LAST);
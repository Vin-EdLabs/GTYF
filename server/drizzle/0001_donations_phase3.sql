ALTER TABLE "donations" ADD COLUMN "receipt_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "manage_link_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "welcome_sent_at" timestamp with time zone;
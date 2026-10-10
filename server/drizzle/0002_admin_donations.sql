ALTER TABLE "donations" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "refund_reason" text;
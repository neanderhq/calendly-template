ALTER TABLE "availability_rule" ADD COLUMN "booking_horizon_days" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD COLUMN "start_time_increment_minutes" integer;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD COLUMN "daily_meeting_limit" integer;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD COLUMN "weekly_meeting_limit" integer;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD COLUMN "monthly_meeting_limit" integer;
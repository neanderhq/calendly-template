CREATE TABLE "booking" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"event_type_id" text NOT NULL,
	"invitee_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"invitee_timezone" text NOT NULL,
	"start_utc" timestamp NOT NULL,
	"end_utc" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"confirmation_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_answer" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"question_id" text,
	"question_label" text NOT NULL,
	"answer" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_event_type_id_event_type_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_answer" ADD CONSTRAINT "booking_answer_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_answer" ADD CONSTRAINT "booking_answer_question_id_booking_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."booking_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_hostId_startUtc_idx" ON "booking" USING btree ("host_id","start_utc");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_confirmationToken_unique" ON "booking" USING btree ("confirmation_token");--> statement-breakpoint
CREATE INDEX "booking_answer_bookingId_idx" ON "booking_answer" USING btree ("booking_id");
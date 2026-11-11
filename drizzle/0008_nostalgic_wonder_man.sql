CREATE TABLE "booking_link" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"token" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"event_type_id" text,
	"meeting_name" text,
	"duration_minutes" integer,
	"description" text,
	"location" text,
	"proposed_starts" timestamp[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_link_kind_check" CHECK ("booking_link"."kind" in ('event_type', 'one_off')),
	CONSTRAINT "booking_link_status_check" CHECK ("booking_link"."status" in ('active', 'used', 'deleted')),
	CONSTRAINT "booking_link_details_check" CHECK (("booking_link"."kind" = 'event_type' and "booking_link"."event_type_id" is not null and "booking_link"."meeting_name" is null and "booking_link"."duration_minutes" is null and "booking_link"."description" is null and "booking_link"."location" is null and "booking_link"."proposed_starts" is null) or ("booking_link"."kind" = 'one_off' and "booking_link"."event_type_id" is null and "booking_link"."meeting_name" is not null and "booking_link"."duration_minutes" is not null and "booking_link"."duration_minutes" > 0 and "booking_link"."proposed_starts" is not null and cardinality("booking_link"."proposed_starts") between 1 and 20))
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "booking_link_id" text;--> statement-breakpoint
ALTER TABLE "booking_link" ADD CONSTRAINT "booking_link_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_link" ADD CONSTRAINT "booking_link_event_type_id_event_type_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_link_token_unique" ON "booking_link" USING btree ("token");--> statement-breakpoint
CREATE INDEX "booking_link_hostId_idx" ON "booking_link" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "booking_link_eventTypeId_idx" ON "booking_link" USING btree ("event_type_id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_booking_link_id_booking_link_id_fk" FOREIGN KEY ("booking_link_id") REFERENCES "public"."booking_link"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_bookingLinkId_unique" ON "booking" USING btree ("booking_link_id");
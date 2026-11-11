CREATE TABLE "booking_attendee" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_attendee_email_lowercase_check" CHECK ("booking_attendee"."email" = lower("booking_attendee"."email"))
);
--> statement-breakpoint
CREATE TABLE "poll" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"token" text NOT NULL,
	"show_votes" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_option" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"start_utc" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poll_vote_email_lowercase_check" CHECK ("poll_vote"."email" = lower("poll_vote"."email"))
);
--> statement-breakpoint
CREATE TABLE "poll_vote_option" (
	"vote_id" text NOT NULL,
	"option_id" text NOT NULL,
	CONSTRAINT "poll_vote_option_vote_id_option_id_pk" PRIMARY KEY("vote_id","option_id")
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "poll_id" text;--> statement-breakpoint
ALTER TABLE "booking_attendee" ADD CONSTRAINT "booking_attendee_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll" ADD CONSTRAINT "poll_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote" ADD CONSTRAINT "poll_vote_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote_option" ADD CONSTRAINT "poll_vote_option_vote_id_poll_vote_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."poll_vote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote_option" ADD CONSTRAINT "poll_vote_option_option_id_poll_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_attendee_bookingId_email_unique" ON "booking_attendee" USING btree ("booking_id","email");--> statement-breakpoint
CREATE INDEX "booking_attendee_bookingId_idx" ON "booking_attendee" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_token_unique" ON "poll" USING btree ("token");--> statement-breakpoint
CREATE INDEX "poll_hostId_idx" ON "poll" USING btree ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_option_pollId_startUtc_unique" ON "poll_option" USING btree ("poll_id","start_utc");--> statement-breakpoint
CREATE INDEX "poll_option_pollId_idx" ON "poll_option" USING btree ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_vote_pollId_email_unique" ON "poll_vote" USING btree ("poll_id","email");--> statement-breakpoint
CREATE INDEX "poll_vote_pollId_idx" ON "poll_vote" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "poll_vote_option_optionId_idx" ON "poll_vote_option" USING btree ("option_id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_pollId_idx" ON "booking" USING btree ("poll_id");
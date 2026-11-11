CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_email_lowercase_check" CHECK ("contact"."email" = lower("contact"."email"))
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancellation_actor" text;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "reschedule_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_hostId_email_unique" ON "contact" USING btree ("host_id","email");
CREATE TABLE "coordinator_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"lab_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coordinator_assignments_coordinator_id_lab_id_key" UNIQUE("coordinator_id","lab_id")
);
--> statement-breakpoint
ALTER TABLE "coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;
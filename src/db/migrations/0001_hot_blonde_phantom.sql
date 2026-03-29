CREATE TABLE "student_team_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"login_email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_login_count" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_team_auth_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"lab_id" uuid,
	"category" varchar(50) NOT NULL,
	"description" varchar NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"resolution_note" varchar,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"slot_date" timestamp NOT NULL,
	"slot_number" smallint NOT NULL,
	"slot_name" varchar(100) NOT NULL,
	"start_time" timestamp NOT NULL,
	"due_time" timestamp NOT NULL,
	"grace_period_minutes" smallint DEFAULT 5 NOT NULL,
	"reminder_minutes" varchar(100) DEFAULT '15,5' NOT NULL,
	"escalation_enabled" boolean DEFAULT true NOT NULL,
	"status" varchar(30) DEFAULT 'upcoming' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_slots_event_date_slot_key" UNIQUE("event_id","slot_date","slot_number")
);
--> statement-breakpoint
CREATE TABLE "lab_attendance_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"lab_id" uuid NOT NULL,
	"submitted_by" uuid,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_att_sub_slot_lab_key" UNIQUE("slot_id","lab_id")
);
--> statement-breakpoint
CREATE TABLE "member_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"is_present" boolean DEFAULT false NOT NULL,
	"marked_by" uuid,
	"marked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_att_submission_member_key" UNIQUE("submission_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "roll_number" varchar(50);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "lab_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "participation_type" varchar(20) DEFAULT 'team' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_project_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_ppt_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_demo_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_final_submission_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "readiness_remarks" varchar;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "evaluation_status" varchar(30) DEFAULT 'not_evaluated' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "registered_by" uuid;--> statement-breakpoint
ALTER TABLE "student_team_auth" ADD CONSTRAINT "student_team_auth_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_slots" ADD CONSTRAINT "attendance_slots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_slots" ADD CONSTRAINT "attendance_slots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attendance_submissions" ADD CONSTRAINT "lab_attendance_submissions_slot_id_attendance_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."attendance_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attendance_submissions" ADD CONSTRAINT "lab_attendance_submissions_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attendance_submissions" ADD CONSTRAINT "lab_attendance_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_submission_id_lab_attendance_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."lab_attendance_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_student_auth_email" ON "student_team_auth" USING btree ("login_email");--> statement-breakpoint
CREATE INDEX "idx_issues_team" ON "issues" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_issues_event" ON "issues" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_issues_lab" ON "issues" USING btree ("lab_id");--> statement-breakpoint
CREATE INDEX "idx_issues_status" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_att_slots_event" ON "attendance_slots" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_lab_att_sub_slot" ON "lab_attendance_submissions" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "idx_member_att_team" ON "member_attendance" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_member_att_submission" ON "member_attendance" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_teams_lab_id" ON "teams" USING btree ("lab_id");
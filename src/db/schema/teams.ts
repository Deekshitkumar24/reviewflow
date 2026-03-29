import { pgTable, uuid, varchar, json, timestamp, boolean, smallint, index, unique, integer } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { events, labs } from "./events";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  labId: uuid("lab_id").references(() => labs.id),
  teamName: varchar("team_name", { length: 150 }).notNull(),
  projectTitle: varchar("project_title", { length: 250 }).notNull(),
  projectDescription: varchar("project_description"),
  domain: varchar("domain", { length: 100 }),
  department: varchar("department", { length: 100 }).notNull(),
  collegeName: varchar("college_name", { length: 200 }).notNull(),
  participationType: varchar("participation_type", { length: 20 }).default("team").notNull(),
  githubUrl: varchar("github_url"),
  pptLink: varchar("ppt_link"),
  demoLink: varchar("demo_link"),
  // Readiness flags (updated by student portal)
  isProjectReady: boolean("is_project_ready").default(false).notNull(),
  isPptReady: boolean("is_ppt_ready").default(false).notNull(),
  isDemoReady: boolean("is_demo_ready").default(false).notNull(),
  isFinalSubmissionReady: boolean("is_final_submission_ready").default(false).notNull(),
  readinessRemarks: varchar("readiness_remarks"),
  // Evaluation status (updated by mentor)
  evaluationStatus: varchar("evaluation_status", { length: 30 }).default("not_evaluated").notNull(),
  attendanceStatus: varchar("attendance_status", { length: 30 }).default("registered").notNull(),
  checkedInAt: timestamp("checked_in_at"),
  checkedInById: uuid("checked_in_by").references(() => users.id),
  registeredById: uuid("registered_by").references(() => users.id),
  importBatchId: uuid("import_batch_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("teams_event_id_team_name_key").on(table.eventId, table.teamName),
  index("idx_teams_event_id").on(table.eventId),
  index("idx_teams_lab_id").on(table.labId),
]);

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  rollNumber: varchar("roll_number", { length: 50 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  isLeader: boolean("is_leader").default(false).notNull(),
  academicYear: smallint("academic_year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_team_members_team_id").on(table.teamId),
]);

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  importedById: uuid("imported_by").notNull().references(() => users.id),
  fileName: varchar("file_name").notNull(),
  totalRows: integer("total_rows").notNull(),
  successRows: integer("success_rows").notNull(),
  failedRows: integer("failed_rows").notNull(),
  errorsJson: json("errors_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

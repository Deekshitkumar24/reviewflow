import { pgTable, uuid, varchar, timestamp, boolean, smallint, integer, index, unique } from "drizzle-orm/pg-core";
import { events, labs } from "./events";
import { teams, teamMembers } from "./teams";
import { users } from "./auth";

/**
 * attendance_slots — Admin-configured time slots for attendance marking per event/day.
 */
export const attendanceSlots = pgTable("attendance_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  slotDate: timestamp("slot_date").notNull(),
  slotNumber: smallint("slot_number").notNull(),
  slotName: varchar("slot_name", { length: 100 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  dueTime: timestamp("due_time").notNull(),
  gracePeriodMinutes: smallint("grace_period_minutes").default(5).notNull(),
  reminderMinutes: varchar("reminder_minutes", { length: 100 }).default("15,5").notNull(),
  escalationEnabled: boolean("escalation_enabled").default(true).notNull(),
  status: varchar("status", { length: 30 }).default("upcoming").notNull(),
  createdById: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("attendance_slots_event_date_slot_key").on(table.eventId, table.slotDate, table.slotNumber),
  index("idx_att_slots_event").on(table.eventId),
]);

/**
 * lab_attendance_submissions — Tracks whether a coordinator has submitted attendance for a given slot + lab.
 */
export const labAttendanceSubmissions = pgTable("lab_attendance_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: uuid("slot_id").notNull().references(() => attendanceSlots.id),
  labId: uuid("lab_id").notNull().references(() => labs.id),
  submittedById: uuid("submitted_by").references(() => users.id),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("lab_att_sub_slot_lab_key").on(table.slotId, table.labId),
  index("idx_lab_att_sub_slot").on(table.slotId),
]);

/**
 * member_attendance — Individual attendance records per member per slot.
 */
export const memberAttendance = pgTable("member_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => labAttendanceSubmissions.id),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  memberId: uuid("member_id").notNull().references(() => teamMembers.id),
  isPresent: boolean("is_present").default(false).notNull(),
  markedById: uuid("marked_by").references(() => users.id),
  markedAt: timestamp("marked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("member_att_submission_member_key").on(table.submissionId, table.memberId),
  index("idx_member_att_team").on(table.teamId),
  index("idx_member_att_submission").on(table.submissionId),
]);

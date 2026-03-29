import { pgTable, uuid, timestamp, index, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { rounds, labs } from "./events";
import { teams } from "./teams";

export const labAssignments = pgTable("lab_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  labId: uuid("lab_id").notNull().references(() => labs.id),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: uuid("assigned_by").notNull().references(() => users.id),
}, (table) => [
  unique("lab_assignments_team_id_round_id_key").on(table.teamId, table.roundId),
  index("idx_lab_assign_round").on(table.roundId),
]);

export const mentorAssignments = pgTable("mentor_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  labId: uuid("lab_id").notNull().references(() => labs.id),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  unique("mentor_assignments_mentor_id_lab_id_round_id_key").on(table.mentorId, table.labId, table.roundId),
]);

export const coordinatorAssignments = pgTable("coordinator_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  coordinatorId: uuid("coordinator_id").notNull().references(() => users.id),
  labId: uuid("lab_id").notNull().references(() => labs.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  unique("coordinator_assignments_coordinator_id_lab_id_key").on(table.coordinatorId, table.labId),
]);

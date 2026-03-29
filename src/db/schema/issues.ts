import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { events } from "./events";
import { labs } from "./events";
import { users } from "./auth";

/**
 * issues — Support issues raised by student/team portal users.
 * Visible to the team that created them, the assigned coordinator, and admins.
 */
export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  labId: uuid("lab_id").references(() => labs.id),
  category: varchar("category", { length: 50 }).notNull(),
  description: varchar("description").notNull(),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  resolutionNote: varchar("resolution_note"),
  resolvedById: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_issues_team").on(table.teamId),
  index("idx_issues_event").on(table.eventId),
  index("idx_issues_lab").on(table.labId),
  index("idx_issues_status").on(table.status),
]);

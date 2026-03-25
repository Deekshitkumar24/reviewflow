import { pgTable, uuid, varchar, timestamp, boolean, integer, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { events } from "./events";
import { teams } from "./teams";

export const results = pgTable("results", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  teamId: uuid("team_id").notNull().references(() => teams.id).unique(),
  finalPosition: integer("final_position"),
  awardType: varchar("award_type", { length: 50 }),
  declaredById: uuid("declared_by").references(() => users.id),
  declaredAt: timestamp("declared_at"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("results_event_id_team_id_key").on(table.eventId, table.teamId),
]);

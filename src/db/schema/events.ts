import { pgTable, uuid, varchar, json, timestamp, boolean, smallint, date, index, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: varchar("event_name", { length: 200 }).notNull(),
  organizerName: varchar("organizer_name", { length: 200 }).notNull(),
  description: varchar("description"),
  eventDate: date("event_date").notNull(),
  venue: varchar("venue", { length: 300 }).notNull(),
  eventType: varchar("event_type", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  totalRounds: smallint("total_rounds").default(1).notNull(),
  suggestionsEnabled: boolean("suggestions_enabled").default(true).notNull(),
  allowMultiMentorReview: boolean("allow_multi_mentor_review").default(false).notNull(),
  scoringModel: json("scoring_model"),
  createdById: uuid("created_by").notNull().references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  roundName: varchar("round_name", { length: 100 }).notNull(),
  roundOrder: smallint("round_order").notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  opensAt: timestamp("opens_at"),
  lockedAt: timestamp("locked_at"),
  lockedById: uuid("locked_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("rounds_event_id_round_order_key").on(table.eventId, table.roundOrder),
  index("idx_rounds_event_id").on(table.eventId),
]);

export const labs = pgTable("labs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  labName: varchar("lab_name", { length: 100 }).notNull(),
  building: varchar("building", { length: 100 }),
  floor: varchar("floor", { length: 20 }),
  capacity: smallint("capacity").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("inactive").notNull(),
  notes: varchar("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("labs_event_id_lab_name_key").on(table.eventId, table.labName),
]);

export const eventSettings = pgTable("event_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  key: varchar("key", { length: 100 }).notNull(),
  valueJson: json("value_json").notNull(),
}, (table) => [
  unique("event_settings_event_id_key_key").on(table.eventId, table.key),
]);

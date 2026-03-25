import { pgTable, uuid, varchar, timestamp, boolean, smallint, decimal, integer, index, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { rounds, labs } from "./events";
import { teams } from "./teams";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  labId: uuid("lab_id").notNull().references(() => labs.id),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  innovationScore: smallint("innovation_score").notNull(),
  technicalScore: smallint("technical_score").notNull(),
  presentationScore: smallint("presentation_score").notNull(),
  feasibilityScore: smallint("feasibility_score").notNull(),
  problemSolvingScore: smallint("problem_solving_score").notNull(),
  communicationScore: smallint("communication_score").notNull(),
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }).notNull(),
  strengths: varchar("strengths"),
  weaknesses: varchar("weaknesses"),
  overallComments: varchar("overall_comments"),
  verdict: varchar("verdict", { length: 30 }).notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("reviews_team_id_mentor_id_round_id_key").on(table.teamId, table.mentorId, table.roundId),
  index("idx_reviews_team_round").on(table.teamId, table.roundId),
  index("idx_reviews_mentor").on(table.mentorId, table.roundId),
]);

export const suggestions = pgTable("suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id").notNull().references(() => reviews.id),
  text: varchar("text").notNull(),
  category: varchar("category", { length: 50 }),
  priority: varchar("priority", { length: 20 }),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_suggestions_review").on(table.reviewId),
]);

export const suggestionStatusLogs = pgTable("suggestion_status_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  suggestionId: uuid("suggestion_id").notNull().references(() => suggestions.id),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  status: varchar("status", { length: 30 }).notNull(),
  verifiedById: uuid("verified_by").references(() => users.id),
  notes: varchar("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("suggestion_status_logs_suggestion_id_round_id_key").on(table.suggestionId, table.roundId),
]);

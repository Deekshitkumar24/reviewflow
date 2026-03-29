import { pgTable, uuid, varchar, timestamp, boolean, smallint, index, unique } from "drizzle-orm/pg-core";
import { teams } from "./teams";

/**
 * student_team_auth — Isolated auth credentials for team/student portal login.
 * One login per registration/team. Completely separate from the staff `users` table.
 */
export const studentTeamAuth = pgTable("student_team_auth", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id).unique(),
  loginEmail: varchar("login_email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  failedLoginCount: smallint("failed_login_count").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_student_auth_email").on(table.loginEmail),
]);

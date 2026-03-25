import { pgTable, uuid, varchar, json, timestamp, boolean, smallint, index, foreignKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { events } from "./events";
import { teams } from "./teams";
import { reviews } from "./reviews";
import { mentorAssignments, labAssignments } from "./assignments";
import { importBatches } from "./teams";
import { results } from "./results";
import { rounds } from "./events";

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  permissions: json("permissions").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  failedLoginCount: smallint("failed_login_count").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  profileImageUrl: varchar("profile_image_url"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // Drizzle doesn't have an auto updatedAt, handle in JS or trigger
}, (table) => [
  index("idx_users_role_id").on(table.roleId),
]);

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id]
  }),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  deviceInfo: varchar("device_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title").notNull(),
  message: varchar("message").notNull(),
  dataJson: json("data_json"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notif_user_unread").on(table.userId, table.isRead),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_user").on(table.userId, table.createdAt),
]);

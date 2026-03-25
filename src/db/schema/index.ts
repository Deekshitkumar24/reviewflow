import { relations } from "drizzle-orm";
import * as auth from "./auth";
import * as events from "./events";
import * as teams from "./teams";
import * as assignments from "./assignments";
import * as reviews from "./reviews";
import * as results from "./results";

export * from "./auth";
export * from "./events";
export * from "./teams";
export * from "./assignments";
export * from "./reviews";
export * from "./results";

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS (Centralized to avoid circular dependencies)
// ─────────────────────────────────────────────────────────────────────────────

export const rolesRelations = relations(auth.roles, ({ many }) => ({
  users: many(auth.users),
}));

export const usersRelations = relations(auth.users, ({ one, many }) => ({
  role: one(auth.roles, { fields: [auth.users.roleId], references: [auth.roles.id] }),
  createdEvents: many(events.events),
  lockedRounds: many(events.rounds),
  checkedInTeams: many(teams.teams),
  mentorAssignments: many(assignments.mentorAssignments),
  auditLogs: many(auth.auditLogs),
  notifications: many(auth.notifications),
  refreshTokens: many(auth.refreshTokens),
  passwordResets: many(auth.passwordResets),
  labAssignments: many(assignments.labAssignments),
  declaredResults: many(results.results),
  importBatches: many(teams.importBatches),
  reviews: many(reviews.reviews),
}));

export const eventsRelations = relations(events.events, ({ one, many }) => ({
  createdBy: one(auth.users, { fields: [events.events.createdById], references: [auth.users.id] }),
  rounds: many(events.rounds),
  labs: many(events.labs),
  teams: many(teams.teams),
  results: many(results.results),
  eventSettings: many(events.eventSettings),
  importBatches: many(teams.importBatches),
}));

export const roundsRelations = relations(events.rounds, ({ one, many }) => ({
  event: one(events.events, { fields: [events.rounds.eventId], references: [events.events.id] }),
  lockedBy: one(auth.users, { fields: [events.rounds.lockedById], references: [auth.users.id] }),
  labAssignments: many(assignments.labAssignments),
  mentorAssignments: many(assignments.mentorAssignments),
  reviews: many(reviews.reviews),
  suggestionStatusLogs: many(reviews.suggestionStatusLogs),
}));

export const labsRelations = relations(events.labs, ({ one, many }) => ({
  event: one(events.events, { fields: [events.labs.eventId], references: [events.events.id] }),
  labAssignments: many(assignments.labAssignments),
  mentorAssignments: many(assignments.mentorAssignments),
  reviews: many(reviews.reviews),
}));

export const teamsRelations = relations(teams.teams, ({ one, many }) => ({
  event: one(events.events, { fields: [teams.teams.eventId], references: [events.events.id] }),
  checkedInBy: one(auth.users, { fields: [teams.teams.checkedInById], references: [auth.users.id] }),
  members: many(teams.teamMembers),
  labAssignments: many(assignments.labAssignments),
  reviews: many(reviews.reviews),
  result: one(results.results, { fields: [teams.teams.id], references: [results.results.teamId] }),
}));

export const teamMembersRelations = relations(teams.teamMembers, ({ one }) => ({
  team: one(teams.teams, { fields: [teams.teamMembers.teamId], references: [teams.teams.id] }),
}));

export const importBatchesRelations = relations(teams.importBatches, ({ one }) => ({
  event: one(events.events, { fields: [teams.importBatches.eventId], references: [events.events.id] }),
  importedBy: one(auth.users, { fields: [teams.importBatches.importedById], references: [auth.users.id] }),
}));

export const labAssignmentsRelations = relations(assignments.labAssignments, ({ one }) => ({
  team: one(teams.teams, { fields: [assignments.labAssignments.teamId], references: [teams.teams.id] }),
  lab: one(events.labs, { fields: [assignments.labAssignments.labId], references: [events.labs.id] }),
  round: one(events.rounds, { fields: [assignments.labAssignments.roundId], references: [events.rounds.id] }),
  assignedBy: one(auth.users, { fields: [assignments.labAssignments.assignedById], references: [auth.users.id] }),
}));

export const mentorAssignmentsRelations = relations(assignments.mentorAssignments, ({ one }) => ({
  mentor: one(auth.users, { fields: [assignments.mentorAssignments.mentorId], references: [auth.users.id] }),
  lab: one(events.labs, { fields: [assignments.mentorAssignments.labId], references: [events.labs.id] }),
  round: one(events.rounds, { fields: [assignments.mentorAssignments.roundId], references: [events.rounds.id] }),
}));

export const reviewsRelations = relations(reviews.reviews, ({ one, many }) => ({
  team: one(teams.teams, { fields: [reviews.reviews.teamId], references: [teams.teams.id] }),
  mentor: one(auth.users, { fields: [reviews.reviews.mentorId], references: [auth.users.id] }),
  lab: one(events.labs, { fields: [reviews.reviews.labId], references: [events.labs.id] }),
  round: one(events.rounds, { fields: [reviews.reviews.roundId], references: [events.rounds.id] }),
  suggestions: many(reviews.suggestions),
}));

export const suggestionsRelations = relations(reviews.suggestions, ({ one, many }) => ({
  review: one(reviews.reviews, { fields: [reviews.suggestions.reviewId], references: [reviews.reviews.id] }),
  statusLogs: many(reviews.suggestionStatusLogs),
}));

export const suggestionStatusLogsRelations = relations(reviews.suggestionStatusLogs, ({ one }) => ({
  suggestion: one(reviews.suggestions, { fields: [reviews.suggestionStatusLogs.suggestionId], references: [reviews.suggestions.id] }),
  round: one(events.rounds, { fields: [reviews.suggestionStatusLogs.roundId], references: [events.rounds.id] }),
  verifiedBy: one(auth.users, { fields: [reviews.suggestionStatusLogs.verifiedById], references: [auth.users.id] }),
}));

export const resultsRelations = relations(results.results, ({ one }) => ({
  event: one(events.events, { fields: [results.results.eventId], references: [events.events.id] }),
  team: one(teams.teams, { fields: [results.results.teamId], references: [teams.teams.id] }),
  declaredBy: one(auth.users, { fields: [results.results.declaredById], references: [auth.users.id] }),
}));

export const eventSettingsRelations = relations(events.eventSettings, ({ one }) => ({
  event: one(events.events, { fields: [events.eventSettings.eventId], references: [events.events.id] }),
}));

export const refreshTokensRelations = relations(auth.refreshTokens, ({ one }) => ({
  user: one(auth.users, { fields: [auth.refreshTokens.userId], references: [auth.users.id] }),
}));

export const passwordResetsRelations = relations(auth.passwordResets, ({ one }) => ({
  user: one(auth.users, { fields: [auth.passwordResets.userId], references: [auth.users.id] }),
}));

export const notificationsRelations = relations(auth.notifications, ({ one }) => ({
  user: one(auth.users, { fields: [auth.notifications.userId], references: [auth.users.id] }),
}));

export const auditLogsRelations = relations(auth.auditLogs, ({ one }) => ({
  user: one(auth.users, { fields: [auth.auditLogs.userId], references: [auth.users.id] }),
}));

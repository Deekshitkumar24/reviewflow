import { z } from 'zod';

// ═══════════════════════════════════════
// Auth Validators
// ═══════════════════════════════════════
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ═══════════════════════════════════════
// User Validators
// ═══════════════════════════════════════
export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
  phone: z.string().max(20).optional(),
  role: z.enum(['admin', 'mentor', 'coordinator']),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

// ═══════════════════════════════════════
// Event Validators
// ═══════════════════════════════════════
export const createEventSchema = z.object({
  eventName: z.string().min(2, 'Event name is required').max(200),
  organizerName: z.string().min(2, 'Organizer name is required').max(200),
  description: z.string().optional(),
  eventDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  venue: z.string().min(2, 'Venue is required').max(300),
  eventType: z.enum(['single_round', 'multi_round']),
  totalRounds: z.number().int().min(1).max(10),
  suggestionsEnabled: z.boolean().optional().default(true),
  allowMultiMentorReview: z.boolean().optional().default(false),
  rounds: z.array(z.object({
    roundName: z.string().min(1).max(100),
    roundOrder: z.number().int().min(1),
  })).min(1, 'At least one round is required'),
});

export const updateEventSchema = z.object({
  eventName: z.string().min(2).max(200).optional(),
  organizerName: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  eventDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  venue: z.string().min(2).max(300).optional(),
  suggestionsEnabled: z.boolean().optional(),
  allowMultiMentorReview: z.boolean().optional(),
});

// ═══════════════════════════════════════
// Team Validators
// ═══════════════════════════════════════
export const createTeamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required').max(150),
  projectTitle: z.string().min(1, 'Project title is required').max(250),
  projectDescription: z.string().optional(),
  domain: z.string().max(100).optional(),
  department: z.string().min(1, 'Department is required').max(100),
  collegeName: z.string().min(1, 'College name is required').max(200),
  githubUrl: z.string().url().optional().or(z.literal('')),
  pptLink: z.string().url().optional().or(z.literal('')),
  demoLink: z.string().url().optional().or(z.literal('')),
  members: z.array(z.object({
    fullName: z.string().min(1).max(120),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    isLeader: z.boolean().optional().default(false),
    academicYear: z.number().int().min(1).max(6).optional(),
  })).min(1, 'At least one team member is required'),
});

// ═══════════════════════════════════════
// Lab Validators
// ═══════════════════════════════════════
export const createLabSchema = z.object({
  labName: z.string().min(1, 'Lab name is required').max(100),
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
  capacity: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// ═══════════════════════════════════════
// Review Validators
// ═══════════════════════════════════════
export const submitReviewSchema = z.object({
  teamId: z.string().uuid(),
  labId: z.string().uuid(),
  roundId: z.string().uuid(),
  innovationScore: z.number().int().min(0).max(10),
  technicalScore: z.number().int().min(0).max(10),
  presentationScore: z.number().int().min(0).max(10),
  feasibilityScore: z.number().int().min(0).max(10),
  problemSolvingScore: z.number().int().min(0).max(10),
  communicationScore: z.number().int().min(0).max(10),
  strengths: z.string().optional(),
  weaknesses: z.string().min(10, 'Weaknesses must be at least 10 characters').optional(),
  overallComments: z.string().optional(),
  verdict: z.enum(['selected', 'not_selected', 'shortlisted', 'hold', 'needs_improvement', 'no_show']),
  isDraft: z.boolean(),
  suggestions: z.array(z.object({
    text: z.string().min(1),
    category: z.enum(['Technical', 'Design', 'Business', 'Other']).optional(),
    priority: z.string().optional(),
    orderIndex: z.number().int().min(0),
  })).max(5).optional(),
  suggestionStatuses: z.array(z.object({
    suggestionId: z.string().uuid(),
    status: z.enum(['completed', 'partial', 'not_done']),
    notes: z.string().optional(),
  })).optional(),
});

// ═══════════════════════════════════════
// Round Validators
// ═══════════════════════════════════════
export const advanceTeamsSchema = z.object({
  teamIds: z.array(z.string().uuid()).min(1, 'Select at least one team'),
  nextRoundId: z.string().uuid(),
});

// ═══════════════════════════════════════
// Lab Assignment Validators
// ═══════════════════════════════════════
export const assignTeamsToLabSchema = z.object({
  roundId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()).min(1),
});

export const assignMentorToLabSchema = z.object({
  roundId: z.string().uuid(),
  mentorId: z.string().uuid(),
});

// ═══════════════════════════════════════
// Attendance Validator
// ═══════════════════════════════════════
export const updateAttendanceSchema = z.object({
  status: z.enum(['checked_in', 'no_show']),
});

// ═══════════════════════════════════════
// Suggestion Status Validator
// ═══════════════════════════════════════
export const suggestionStatusSchema = z.object({
  roundId: z.string().uuid(),
  status: z.enum(['completed', 'partial', 'not_done']),
  notes: z.string().optional(),
});

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
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
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
  scoringModel: z.any().optional(),
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

// ═══════════════════════════════════════
// Coordinator Registration Validator
// ═══════════════════════════════════════
const memberSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(120),
  rollNumber: z.string().min(1, 'Roll number is required').max(50),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  isLeader: z.boolean().default(false),
  academicYear: z.number().int().min(1).max(6).optional(),
});

export const coordinatorRegisterTeamSchema = z.object({
  eventId: z.string().uuid(),
  teamName: z.string().min(1, 'Team name is required').max(150),
  projectTitle: z.string().min(1, 'Project title is required').max(250),
  projectDescription: z.string().optional(),
  domain: z.string().max(100).optional(),
  department: z.string().min(1, 'Department is required').max(100),
  collegeName: z.string().min(1, 'College name is required').max(200),
  participationType: z.enum(['solo', 'duo', 'team']),
  loginEmail: z.string().email('Invalid student login email').transform(v => v.toLowerCase().trim()),
  loginPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  members: z.array(memberSchema).min(1),
}).superRefine((data, ctx) => {
  const { participationType, members } = data;
  if (participationType === 'solo' && members.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Solo requires exactly 1 member', path: ['members'] });
  }
  if (participationType === 'duo' && members.length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duo requires exactly 2 members', path: ['members'] });
  }
  if (participationType === 'team' && (members.length < 3 || members.length > 6)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Team requires 3-6 members', path: ['members'] });
  }
  const leaders = members.filter(m => m.isLeader);
  if (leaders.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly one leader is required', path: ['members'] });
  }
});

// ═══════════════════════════════════════
// Student Login Validator
// ═══════════════════════════════════════
export const studentLoginSchema = z.object({
  email: z.string().email('Invalid email').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

// ═══════════════════════════════════════
// Issue Validators
// ═══════════════════════════════════════
export const createIssueSchema = z.object({
  category: z.enum([
    'network_issue', 'no_coordinator_support', 'no_mentor_support',
    'system_login_issue', 'lab_infrastructure_issue', 'ppt_issue',
    'evaluation_delay', 'other',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
  resolutionNote: z.string().max(2000).optional(),
});

// ═══════════════════════════════════════
// Readiness Validator
// ═══════════════════════════════════════
export const updateReadinessSchema = z.object({
  isProjectReady: z.boolean(),
  isPptReady: z.boolean(),
  isDemoReady: z.boolean(),
  isFinalSubmissionReady: z.boolean(),
  readinessRemarks: z.string().max(500).optional(),
});

// ═══════════════════════════════════════
// Evaluation Status Validator
// ═══════════════════════════════════════
export const updateEvaluationStatusSchema = z.object({
  evaluationStatus: z.enum(['not_evaluated', 'under_evaluation', 'evaluated', 're_evaluation_required']),
});

// ═══════════════════════════════════════
// Attendance Slot Validator
// ═══════════════════════════════════════
export const createAttendanceSlotSchema = z.object({
  eventId: z.string().uuid(),
  slotDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
  slotNumber: z.number().int().min(1),
  slotName: z.string().min(1).max(100),
  startTime: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid time'),
  dueTime: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid time'),
  gracePeriodMinutes: z.number().int().min(0).max(60).default(5),
  reminderMinutes: z.string().default('15,5'),
  escalationEnabled: z.boolean().default(true),
});

// ═══════════════════════════════════════
// Attendance Submission Validator
// ═══════════════════════════════════════
export const submitAttendanceSchema = z.object({
  slotId: z.string().uuid(),
  records: z.array(z.object({
    memberId: z.string().uuid(),
    teamId: z.string().uuid(),
    isPresent: z.boolean(),
  })).min(1, 'At least one attendance record is required'),
});


// ReviewFlow v3.0 — Shared TypeScript Types

// ═══════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════
export type RoleName = 'super_admin' | 'admin' | 'mentor' | 'coordinator';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
  mustChangePassword: boolean;
  profileImageUrl?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

// ═══════════════════════════════════════
// Event Types
// ═══════════════════════════════════════
export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';
export type EventType = 'single_round' | 'multi_round';

export interface EventSummary {
  id: string;
  eventName: string;
  organizerName: string;
  eventDate: string;
  venue: string;
  eventType: EventType;
  status: EventStatus;
  totalRounds: number;
  teamCount?: number;
  labCount?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface EventDetail extends EventSummary {
  description?: string;
  suggestionsEnabled: boolean;
  allowMultiMentorReview: boolean;
  scoringModel?: Record<string, number>;
  rounds: RoundSummary[];
  labs: LabSummary[];
  createdBy: { id: string; fullName: string };
}

export interface CreateEventRequest {
  eventName: string;
  organizerName: string;
  description?: string;
  eventDate: string;
  venue: string;
  eventType: EventType;
  totalRounds: number;
  suggestionsEnabled?: boolean;
  allowMultiMentorReview?: boolean;
  rounds: { roundName: string; roundOrder: number }[];
}

// ═══════════════════════════════════════
// Round Types
// ═══════════════════════════════════════
export type RoundStatus = 'pending' | 'open' | 'locked' | 'completed';

export interface RoundSummary {
  id: string;
  roundName: string;
  roundOrder: number;
  status: RoundStatus;
  opensAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: { id: string; fullName: string } | null;
  teamCount?: number;
  reviewedCount?: number;
}

// ═══════════════════════════════════════
// Lab Types
// ═══════════════════════════════════════
export type LabStatus = 'inactive' | 'active' | 'in_progress' | 'completed';

export interface LabSummary {
  id: string;
  labName: string;
  building?: string | null;
  floor?: string | null;
  capacity: number;
  status: LabStatus;
  teamCount?: number;
  reviewedCount?: number;
  mentors?: { id: string; fullName: string }[];
}

// ═══════════════════════════════════════
// Team Types
// ═══════════════════════════════════════
export type AttendanceStatus = 'registered' | 'checked_in' | 'no_show' | 'disqualified' | 'withdrawn';

export interface TeamSummary {
  id: string;
  teamName: string;
  projectTitle: string;
  domain?: string | null;
  department: string;
  collegeName: string;
  attendanceStatus: AttendanceStatus;
  memberCount?: number;
  latestVerdict?: VerdictType | null;
  latestScore?: number | null;
  labName?: string | null;
}

export interface TeamDetail extends TeamSummary {
  projectDescription?: string | null;
  githubUrl?: string | null;
  pptLink?: string | null;
  demoLink?: string | null;
  checkedInAt?: string | null;
  members: TeamMember[];
  reviews: ReviewSummary[];
}

export interface TeamMember {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  isLeader: boolean;
  academicYear?: number | null;
}

// ═══════════════════════════════════════
// Review Types
// ═══════════════════════════════════════
export type VerdictType = 'selected' | 'not_selected' | 'shortlisted' | 'hold' | 'needs_improvement' | 'no_show';

export interface ReviewScores {
  innovationScore: number;
  technicalScore: number;
  presentationScore: number;
  feasibilityScore: number;
  problemSolvingScore: number;
  communicationScore: number;
}

export interface ReviewSummary {
  id: string;
  teamId: string;
  teamName: string;
  mentorId: string;
  mentorName: string;
  labId: string;
  roundId: string;
  roundName: string;
  compositeScore: number;
  verdict: VerdictType;
  isDraft: boolean;
  reviewedAt: string;
}

export interface ReviewDetail extends ReviewSummary, ReviewScores {
  strengths?: string | null;
  weaknesses?: string | null;
  overallComments?: string | null;
  suggestions: SuggestionItem[];
}

export interface SubmitReviewRequest extends ReviewScores {
  teamId: string;
  labId: string;
  roundId: string;
  strengths?: string;
  weaknesses?: string;
  overallComments?: string;
  verdict: VerdictType;
  isDraft: boolean;
  suggestions?: { text: string; category?: string; priority?: string; orderIndex: number }[];
}

// ═══════════════════════════════════════
// Suggestion Types
// ═══════════════════════════════════════
export type SuggestionStatus = 'completed' | 'partial' | 'not_done';
export type SuggestionCategory = 'Technical' | 'Design' | 'Business' | 'Other';

export interface SuggestionItem {
  id: string;
  text: string;
  category?: string | null;
  priority?: string | null;
  orderIndex: number;
  statusLogs?: SuggestionStatusEntry[];
}

export interface SuggestionStatusEntry {
  id: string;
  roundId: string;
  status: SuggestionStatus;
  notes?: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════
// Result Types
// ═══════════════════════════════════════
export type AwardType = 'winner' | 'runner_up' | 'second_runner_up' | 'finalist' | 'special_mention' | 'participant';

export interface ResultItem {
  id: string;
  teamId: string;
  teamName: string;
  projectTitle: string;
  finalPosition?: number | null;
  awardType?: AwardType | null;
  compositeScore: number;
  isPublished: boolean;
  declaredAt?: string | null;
}

// ═══════════════════════════════════════
// User Management Types
// ═══════════════════════════════════════
export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: RoleName;
  status: 'active' | 'disabled';
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  role: RoleName;
}

// ═══════════════════════════════════════
// Notification Types
// ═══════════════════════════════════════
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  dataJson?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════
// Audit Log Types
// ═══════════════════════════════════════
export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
}

// ═══════════════════════════════════════
// Live Feed / Socket Types
// ═══════════════════════════════════════
export interface LiveFeedEvent {
  id: string;
  type: 'review_submitted' | 'team_checked_in' | 'round_opened' | 'round_locked' | 'results_published' | 'alert';
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════
// Scoring Constants
// ═══════════════════════════════════════
export const SCORING_CRITERIA = [
  { key: 'technicalScore' as const, label: 'Technical Implementation', weight: 0.25, guidance: 'Is the code/hardware actually working? Depth of technical solution.' },
  { key: 'innovationScore' as const, label: 'Innovation & Originality', weight: 0.20, guidance: 'How novel is the idea? Does it solve a problem in a new way?' },
  { key: 'problemSolvingScore' as const, label: 'Problem Solving', weight: 0.20, guidance: 'Deep understanding of the problem? Is the solution coherent?' },
  { key: 'feasibilityScore' as const, label: 'Feasibility & Viability', weight: 0.15, guidance: 'Can this realistically be deployed?' },
  { key: 'presentationScore' as const, label: 'Presentation & Comm', weight: 0.10, guidance: 'Can the team explain to a non-technical audience?' },
  { key: 'communicationScore' as const, label: 'UI/UX (if applicable)', weight: 0.10, guidance: 'Is the interface intuitive? User experience quality.' },
] as const;

export function calculateCompositeScore(scores: ReviewScores): number {
  const raw = SCORING_CRITERIA.reduce((sum, c) => sum + (scores[c.key] * c.weight), 0);
  return parseFloat((raw * 10).toFixed(2));
}

// ═══════════════════════════════════════
// Verdict Config
// ═══════════════════════════════════════
export const VERDICT_CONFIG = {
  selected:          { color: '#0E9F6E', bg: '#F0FFF4', label: 'Selected',           icon: '✅' },
  shortlisted:       { color: '#1A56DB', bg: '#EFF6FF', label: 'Shortlisted',        icon: '🔵' },
  hold:              { color: '#D97706', bg: '#FFFBEB', label: 'Hold',               icon: '🟡' },
  needs_improvement: { color: '#7E3AF2', bg: '#F5F3FF', label: 'Needs Improvement',  icon: '🟣' },
  not_selected:      { color: '#DC2626', bg: '#FEF2F2', label: 'Not Selected',       icon: '🔴' },
  no_show:           { color: '#6B7280', bg: '#F9FAFB', label: 'No Show',            icon: '⬜' },
} as const;

export const ATTENDANCE_CONFIG = {
  registered:   { color: '#6B7280', bg: '#F9FAFB', label: 'Registered' },
  checked_in:   { color: '#0E9F6E', bg: '#F0FFF4', label: 'Checked In' },
  no_show:      { color: '#DC2626', bg: '#FEF2F2', label: 'No Show' },
  disqualified: { color: '#7E3AF2', bg: '#F5F3FF', label: 'Disqualified' },
  withdrawn:    { color: '#D97706', bg: '#FFFBEB', label: 'Withdrawn' },
} as const;

// src/types/ai.ts
export interface AIErrorResponse {
  error: true;
  message: string;
  retryable: boolean;
}

export interface AITextResponse {
  result: string;
  tokensUsed: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  affectedEntity: string;
  timestamp: string;
  resolved: boolean;
}

export interface BiasAnalysisResult {
  eventMean: number;
  judges: {
    judgeId: string;
    judgeName: string;
    mean: number;
    stdDev: number;
    zScore: number;
    submissionsScored: number;
    flag: "none" | "too-high" | "too-low" | "low-discrimination";
    flagReason?: string;
  }[];
}

export interface PlagiarismResult {
  flaggedPairs: {
    team1: { id: string; name: string };
    team2: { id: string; name: string };
    similarityScore: number;
    overlappingSections: string[];
  }[];
  checkedAt: string;
}

export interface FeedbackResult {
  subject: string;
  body: string;
  tone: "encouraging" | "neutral" | "critical";
}

export interface RubricResult {
  rubricName: string;
  categories: {
    name: string;
    description: string;
    maxScore: number;
    weight: number;
    scoringGuide: {
      excellent: string;
      good: string;
      average: string;
      poor: string;
    };
  }[];
}

export interface QualityScoreResult {
  qualityScore: number;
  grade: "Excellent" | "Good" | "Needs Work" | "Incomplete";
  tips: string[];
  missingFields: string[];
}

export interface ReportResult {
  title: string;
  generatedAt: string;
  sections: {
    executiveSummary: string;
    participationStats: string;
    scoringAnalysis: string;
    topPerformers: string;
    judgePerformance: string;
    anomaliesDetected: string;
    recommendationsForNext: string;
  };
}

export interface AssignmentSuggestion {
  teamId: string;
  labId: string;
  mentorId: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

'use client';

import { useStudentStore } from '@/stores/useStudentStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentApiClient from '@/lib/studentApiClient';
import { Loader2, CheckCircle, X, Sparkles, Plus, Trash2, ChevronDown, ChevronUp, HelpCircle, Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import axios from 'axios';

const READINESS_FLAGS = [
  { key: 'isProjectReady', label: 'Project ready for evaluation' },
  { key: 'isPptReady', label: 'PPT completed' },
  { key: 'isDemoReady', label: 'Demo ready' },
  { key: 'isFinalSubmissionReady', label: 'Final submission ready' },
] as const;

interface PitchScoreResult {
  scores: Record<string, { score: number | 'not_assessed'; reason: string }>;
  questions: string[];
  summary: {
    overview: string;
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
}

const SCORE_LABELS: Record<string, string> = {
  technicalImplementation: 'Technical Implementation',
  innovation: 'Innovation & Originality',
  problemUnderstanding: 'Problem Understanding',
  feasibility: 'Feasibility',
  uiUx: 'UI/UX Design',
  presentation: 'Presentation Quality',
};

function ScoreBadge({ score }: { score: number | 'not_assessed' }) {
  if (score === 'not_assessed') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">N/A</span>;
  }
  const color = score >= 8 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
                score >= 6 ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' :
                score >= 4 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' :
                'text-red-600 bg-red-50 dark:bg-red-950/30';
  return <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${color}`}>{score}/10</span>;
}

export default function StudentReadinessPage() {
  const { team } = useStudentStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard', team?.teamId],
    queryFn: async () => {
      const res = await studentApiClient.get('/student/team');
      return res.data.data;
    },
    enabled: !!team?.teamId,
  });

  const [remarks, setRemarks] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  // AI Pitch Scoring state
  const [pitchForm, setPitchForm] = useState({
    title: '',
    problemStatement: '',
    solution: '',
    techStack: { frontend: '', backend: '', database: '', cloud: '' },
    features: [''],
    explanation: '',
  });
  const [pitchResult, setPitchResult] = useState<PitchScoreResult | null>(null);
  const [pitchExpanded, setPitchExpanded] = useState(false);

  if (data && !initialized) {
    setFlags({
      isProjectReady: data.isProjectReady,
      isPptReady: data.isPptReady,
      isDemoReady: data.isDemoReady,
      isFinalSubmissionReady: data.isFinalSubmissionReady,
    });
    setRemarks(data.readinessRemarks || '');
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await studentApiClient.patch('/student/readiness', body);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Readiness updated');
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mentor', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => toast.error('Failed to update readiness'),
  });

  const pitchMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/v1/ai/pitch-score', {
        ...pitchForm,
        features: pitchForm.features.filter(f => f.trim() !== ''),
      });
      return res.data.result as PitchScoreResult;
    },
    onSuccess: (result) => {
      setPitchResult(result);
      toast.success('Pitch scored successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to score pitch';
      toast.error(msg);
    },
  });

  const handleSave = () => {
    mutation.mutate({
      isProjectReady: flags.isProjectReady ?? false,
      isPptReady: flags.isPptReady ?? false,
      isDemoReady: flags.isDemoReady ?? false,
      isFinalSubmissionReady: flags.isFinalSubmissionReady ?? false,
      readinessRemarks: remarks || undefined,
    });
  };

  const addFeature = () => setPitchForm(prev => ({ ...prev, features: [...prev.features, ''] }));
  const removeFeature = (i: number) => setPitchForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, val: string) => setPitchForm(prev => ({
    ...prev,
    features: prev.features.map((f, idx) => idx === i ? val : f),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Project Readiness</h1>
        <p className="text-sm text-gray-500 mt-1">Update your team&apos;s readiness status before evaluation.</p>
      </div>

      {/* Readiness Flags */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {READINESS_FLAGS.map((flag) => (
          <button
            key={flag.key}
            type="button"
            onClick={() => setFlags(prev => ({ ...prev, [flag.key]: !prev[flag.key] }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">{flag.label}</span>
            {flags[flag.key] ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <X className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Remarks (optional)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          placeholder="Any notes about your project status..."
          maxLength={500}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
      >
        {mutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          'Save Readiness'
        )}
      </Button>

      {/* ─── AI PROJECT PITCH SCORING ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setPitchExpanded(!pitchExpanded)}
          className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Project Pitch Score</span>
          </div>
          {pitchExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {pitchExpanded && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4">
            <p className="text-xs text-gray-500">
              Submit your project pitch for an AI-powered evaluation. Get detailed scores, improvement suggestions, and potential interview questions.
            </p>

            {/* Title */}
            <div>
              <Label className="text-xs">Project Title *</Label>
              <Input
                value={pitchForm.title}
                onChange={e => setPitchForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 text-sm mt-1"
                placeholder="e.g., AI-Powered Attendance System"
              />
            </div>

            {/* Problem Statement */}
            <div>
              <Label className="text-xs">Problem Statement *</Label>
              <textarea
                value={pitchForm.problemStatement}
                onChange={e => setPitchForm(prev => ({ ...prev, problemStatement: e.target.value }))}
                className="w-full h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                placeholder="What problem does your project solve?"
              />
            </div>

            {/* Solution */}
            <div>
              <Label className="text-xs">Solution *</Label>
              <textarea
                value={pitchForm.solution}
                onChange={e => setPitchForm(prev => ({ ...prev, solution: e.target.value }))}
                className="w-full h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                placeholder="How does your project solve this problem?"
              />
            </div>

            {/* Tech Stack */}
            <div>
              <Label className="text-xs mb-2 block">Tech Stack</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={pitchForm.techStack.frontend}
                  onChange={e => setPitchForm(prev => ({ ...prev, techStack: { ...prev.techStack, frontend: e.target.value } }))}
                  className="h-9 text-xs"
                  placeholder="Frontend (e.g., React, Next.js)"
                />
                <Input
                  value={pitchForm.techStack.backend}
                  onChange={e => setPitchForm(prev => ({ ...prev, techStack: { ...prev.techStack, backend: e.target.value } }))}
                  className="h-9 text-xs"
                  placeholder="Backend (e.g., Node.js, Express)"
                />
                <Input
                  value={pitchForm.techStack.database}
                  onChange={e => setPitchForm(prev => ({ ...prev, techStack: { ...prev.techStack, database: e.target.value } }))}
                  className="h-9 text-xs"
                  placeholder="Database (e.g., PostgreSQL)"
                />
                <Input
                  value={pitchForm.techStack.cloud}
                  onChange={e => setPitchForm(prev => ({ ...prev, techStack: { ...prev.techStack, cloud: e.target.value } }))}
                  className="h-9 text-xs"
                  placeholder="Cloud (e.g., Vercel, AWS)"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Key Features *</Label>
                <button type="button" onClick={addFeature} className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {pitchForm.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={e => updateFeature(i, e.target.value)}
                      className="h-9 text-xs flex-1"
                      placeholder={`Feature ${i + 1}`}
                    />
                    {pitchForm.features.length > 1 && (
                      <button type="button" onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <Label className="text-xs">Additional Explanation</Label>
              <textarea
                value={pitchForm.explanation}
                onChange={e => setPitchForm(prev => ({ ...prev, explanation: e.target.value }))}
                className="w-full h-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                placeholder="Any additional context or explanation..."
              />
            </div>

            <Button
              onClick={() => pitchMutation.mutate()}
              disabled={pitchMutation.isPending || !pitchForm.title || !pitchForm.problemStatement || !pitchForm.solution}
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {pitchMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Pitch...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Score My Pitch</>
              )}
            </Button>

            {/* ─── RESULTS ─── */}
            {pitchResult && (
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Summary</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{pitchResult.summary.overview}</p>
                </div>

                {/* Scores */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Scores</h3>
                  <div className="space-y-3">
                    {Object.entries(pitchResult.scores).map(([key, val]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{SCORE_LABELS[key] || key}</span>
                          <ScoreBadge score={val.score} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{val.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                {pitchResult.summary.strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-emerald-500" /> Strengths
                    </h3>
                    <ul className="space-y-1.5">
                      {pitchResult.summary.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {pitchResult.summary.improvements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Improvements
                    </h3>
                    <ul className="space-y-1.5">
                      {pitchResult.summary.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {pitchResult.summary.nextSteps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Next Steps</h3>
                    <ul className="space-y-1.5">
                      {pitchResult.summary.nextSteps.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions */}
                {pitchResult.questions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-500" /> Likely Interview Questions
                    </h3>
                    <ul className="space-y-2">
                      {pitchResult.questions.map((q, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-900/30">
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

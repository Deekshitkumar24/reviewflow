'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface Suggestion {
  teamId: string;
  teamName: string;
  labId: string;
  labName: string;
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
}

export function SmartAssignmentPanel({
  eventId,
  rounds,
  onComplete
}: {
  eventId: string;
  rounds: { id: string; roundName: string }[];
  onComplete: () => void;
}) {
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });

  const handleGenerateSuggestions = async () => {
    if (!eventId || !selectedRoundId) {
      toast.error('Please select a round first.');
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    setSummary('');

    try {
      const response = await apiClient.post('/assignments/suggest', {
        eventId,
        roundId: selectedRoundId
      });

      if (response.data.data.suggestions) {
        const newSuggestions = response.data.data.suggestions;
        setSuggestions(newSuggestions);
        setSelectedSuggestions(new Set(newSuggestions.map((s: Suggestion) => s.teamId)));
        setSummary(response.data.data.summary);

        if (newSuggestions.length === 0) {
          toast.success('No unassigned teams found.');
        } else {
          toast.success('Suggestions generated successfully.');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to generate suggestions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySelected = async () => {
    const toApply = suggestions.filter(s => selectedSuggestions.has(s.teamId));
    if (toApply.length === 0) return;

    // Capacity safety: Check if any selected suggestion is an overflow fallback
    const hasOverflow = toApply.some(s => s.confidence === 'Low');
    if (hasOverflow) {
      toast.error('Apply blocked: One or more selected assignments exceed the target lab capacity.');
      return;
    }

    setIsApplying(true);
    setApplyProgress({ current: 0, total: toApply.length });
    let successCount = 0;
    let failCount = 0;
    
    // sequential calls as decided in implementation plan
    for (const assignment of toApply) {
      try {
        await apiClient.post('/lab-assignments', {
          teamId: assignment.teamId,
          labId: assignment.labId,
          roundId: selectedRoundId
        });
        successCount++;
      } catch (e: any) {
        console.error('Failed to assign team', assignment.teamId, e);
        failCount++;
      } finally {
        setApplyProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }

    setIsApplying(false);
    if (successCount === toApply.length) {
      toast.success(`Successfully applied ${successCount} assignments.`);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setSummary('');
      onComplete();
    } else {
      // Partial failure handling
      toast.error(`Applied ${successCount}, ${failCount} failed. Please review errors or try again.`);
      // Remove successful ones from suggestions list to allow retrying failures
      // Simplification: just reset all so user regenerates cleanly
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setSummary('');
      onComplete();
    }
  };

  const toggleSelection = (teamId: string) => {
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(teamId)) {
      newSet.delete(teamId);
    } else {
      newSet.add(teamId);
    }
    setSelectedSuggestions(newSet);
  };

  if (!eventId) return null;

  return (
    <Card className="border border-purple-500/20 bg-gradient-to-br from-[#1A1A1A] to-[#111]">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Smart Team Assignment
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">AI Powered</Badge>
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Automatically distribute unassigned checked-in teams evenly across active labs based on capacity.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        
        <div className="flex gap-4 items-end mt-4">
          <div className="w-64 space-y-2">
            <label className="text-xs font-medium text-gray-400">Target Round</label>
            <Select value={selectedRoundId} onValueChange={(val) => setSelectedRoundId(val || '')}>
              <SelectTrigger className="w-full bg-[#222] border-white/10 h-9">
                <SelectValue placeholder="Select Round to Assign" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.roundName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleGenerateSuggestions} 
            disabled={isLoading || !selectedRoundId} 
            className="bg-purple-600 hover:bg-purple-700 text-white h-9"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Generate Suggestions
          </Button>
        </div>

        {summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 flex gap-3">
            <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-sm text-purple-100">{summary}</p>
          </motion.div>
        )}

        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 border border-white/10 rounded-lg overflow-hidden">
            <div className="bg-[#222] px-4 py-2 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-200">
                Found {suggestions.length} unassigned teams
              </span>
              <span className="text-xs text-gray-500">
                {selectedSuggestions.size} selected
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 bg-[#1A1A1A]">
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <label key={s.teamId} className="flex items-center gap-3 p-3 rounded-md hover:bg-white/5 cursor-pointer border-b border-white/[0.02] last:border-0">
                    <Checkbox 
                      checked={selectedSuggestions.has(s.teamId)} 
                      onCheckedChange={() => toggleSelection(s.teamId)}
                    />
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{s.teamName}</span>
                        <Badge variant="outline" className={
                          s.confidence === 'High' ? 'border-green-500/30 text-green-400' :
                          s.confidence === 'Medium' ? 'border-blue-500/30 text-blue-400' :
                          'border-red-500/30 text-red-400'
                        }>
                          {s.confidence} Match
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 text-purple-400" />
                          Assigning to <strong className="text-gray-300">{s.labName}</strong>
                        </span>
                        <span className="text-gray-500 max-w-[200px] truncate text-right" title={s.reason}>
                          {s.reason}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-3 bg-[#222] border-t border-white/10 flex justify-end">
              <Button 
                onClick={handleApplySelected}
                disabled={isApplying || selectedSuggestions.size === 0}
                className="bg-green-600 hover:bg-green-700 transition-all border border-green-500/20 shadow-lg"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying ({applyProgress.current}/{applyProgress.total})
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Selected ({selectedSuggestions.size})
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

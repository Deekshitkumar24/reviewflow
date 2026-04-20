'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Settings, Check, Loader2, Plus, Trash2, Wand2, Calculator, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const STEPS = [
  { label: 'Basic Info', icon: Calendar },
  { label: 'Rounds', icon: Settings },
  { label: 'Rubric', icon: FileText },
  { label: 'Settings', icon: Settings },
  { label: 'Review', icon: Check },
];

const eventSchema = z.object({
  eventName: z.string().min(2, 'Event name is required'),
  organizerName: z.string().min(2, 'Organizer name is required'),
  description: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  venue: z.string().min(2, 'Venue is required'),
  eventType: z.enum(['single_round', 'multi_round']),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [allowMultiMentor, setAllowMultiMentor] = useState(false);
  const [rounds, setRounds] = useState([
    { roundName: 'Round 1 â€” Preliminary', roundOrder: 1 },
  ]);
  const [rubricTheme, setRubricTheme] = useState('');
  const [rubricData, setRubricData] = useState<{key: string, label: string, guidance: string, weight: number}[]>([
    { key: 'technical', label: 'Technical Implementation', guidance: 'Quality of code and arch', weight: 40 },
    { key: 'innovation', label: 'Innovation', guidance: 'How novel is it?', weight: 30 },
    { key: 'design', label: 'Design & UX', guidance: 'User interface quality', weight: 30 }
  ]);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [rubricConfirmed, setRubricConfirmed] = useState(true);
  const [rubricEdited, setRubricEdited] = useState(false);

  const totalWeight = rubricData.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isRubricValid = totalWeight === 100;

  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    const factor = 100 / totalWeight;
    let newTotal = 0;
    const normalized = rubricData.map((r, i) => {
      let w = Math.round((r.weight || 0) * factor);
      if (i === rubricData.length - 1) {
         w = 100 - newTotal; // adjust last one to exactly reach 100
      } else {
         newTotal += w;
      }
      return { ...r, weight: w >= 0 ? w : 0 };
    });
    setRubricData(normalized);
    setRubricConfirmed(false);
  };

  const { register, handleSubmit, watch, formState: { errors }, getValues, trigger } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { eventType: 'multi_round' },
  });

  const eventType = watch('eventType');

  const addRound = () => {
    if (rounds.length >= 5) return;
    const order = rounds.length + 1;
    const names = ['', 'Preliminary', 'Semifinals', 'Finals', 'Grand Finale', 'Bonus'];
    setRounds([...rounds, { roundName: `Round ${order} â€” ${names[order] || 'Round ' + order}`, roundOrder: order }]);
  };

  const removeRound = (idx: number) => {
    if (rounds.length <= 1) return;
    setRounds(rounds.filter((_, i) => i !== idx).map((r, i) => ({ ...r, roundOrder: i + 1 })));
  };

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(['eventName', 'organizerName', 'eventDate', 'venue', 'eventType']);
      if (!valid) return;
    }
    if (step === 2 && (!isRubricValid || !rubricConfirmed)) {
      toast.error('Please confirm a valid rubric (weights must sum to 100) before proceeding.');
      return;
    }
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const generateRubric = async () => {
    if (rubricEdited && rubricData.length > 0) {
       if (!confirm("You have edited the rubric manually. Do you want to overwrite it with a newly generated one?")) return;
    }
    setIsGeneratingRubric(true);
    setRubricConfirmed(false);
    try {
      const res = await fetch('/api/v1/ai/rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: rubricTheme || formValues.eventName })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setRubricData(data.result);
      setRubricEdited(false);
      toast.success('AI Rubric generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate rubric');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const prevStep = () => setStep(Math.max(step - 1, 0));

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/events', {
        ...data,
        totalRounds: rounds.length,
        suggestionsEnabled,
        allowMultiMentorReview: allowMultiMentor,
        rounds,
        scoringModel: rubricData, 
      });
      toast.success('Event created successfully');
      router.push('/events');
    } catch {
      toast.error('Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formValues = getValues();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/events')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Event</h1>
          <p className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              i === step ? 'bg-blue-50 dark:bg-blue-950/40 text-[#1A56DB]' :
              i < step ? 'text-green-600' : 'text-gray-400'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Basic Info */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Name *</Label>
                    <Input id="eventName" placeholder="Tech Expo 2026" className="h-11" {...register('eventName')} />
                    {errors.eventName && <p className="text-xs text-red-500">{errors.eventName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizerName">Organizer *</Label>
                    <Input id="organizerName" placeholder="Computer Science Department" className="h-11" {...register('organizerName')} />
                    {errors.organizerName && <p className="text-xs text-red-500">{errors.organizerName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Brief description of the event..." rows={3} {...register('description')} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Event Date *</Label>
                      <Input id="eventDate" type="date" className="h-11" {...register('eventDate')} />
                      {errors.eventDate && <p className="text-xs text-red-500">{errors.eventDate.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue">Venue *</Label>
                      <Input id="venue" placeholder="Main Campus, Block A" className="h-11" {...register('venue')} />
                      {errors.venue && <p className="text-xs text-red-500">{errors.venue.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type *</Label>
                    <Select value={eventType} onValueChange={(v) => {
                      // Manually set the form value
                      const el = document.getElementById('eventType') as HTMLInputElement;
                      if (el) el.value = v || '';
                    }}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_round">Single Round</SelectItem>
                        <SelectItem value="multi_round">Multi Round</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" id="eventType" {...register('eventType')} />
                  </div>
                </div>
              )}

              {/* Step 2: Rounds */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Configure Rounds</h3>
                    <Button variant="outline" size="sm" onClick={addRound} disabled={rounds.length >= 5}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Round
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {rounds.map((round, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <Badge variant="secondary" className="px-2.5 py-1">{round.roundOrder}</Badge>
                        <Input
                          value={round.roundName}
                          onChange={(e) => {
                            const updated = [...rounds];
                            updated[i].roundName = e.target.value;
                            setRounds(updated);
                          }}
                          className="flex-1 h-9"
                        />
                        {rounds.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeRound(i)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Rubric Builder */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-end p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                    <div className="flex-1 space-y-1">
                      <Label className="text-blue-400 font-semibold flex items-center gap-2">
                        <Wand2 className="w-4 h-4" /> AI Rubric Builder
                      </Label>
                      <p className="text-xs text-gray-400">Describe the event focus or theme, and AI will generate custom scoring criteria.</p>
                      <Input 
                        placeholder="e.g., Blockchain for Sustainability Hackathon" 
                        value={rubricTheme} 
                        onChange={(e) => setRubricTheme(e.target.value)} 
                        className="h-9 bg-[#111] border-white/10 mt-2"
                        disabled={isGeneratingRubric}
                      />
                    </div>
                    <Button onClick={generateRubric} disabled={isGeneratingRubric || !rubricTheme} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 whitespace-nowrap">
                      {isGeneratingRubric ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                      Generate Rubric
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-gray-400"/>
                        Scoring Criteria Weights
                      </h3>
                      {!rubricConfirmed && (
                         <div className="flex items-center gap-3">
                           {!isRubricValid && totalWeight > 0 && (
                             <Button variant="outline" size="sm" onClick={normalizeWeights} className="h-7 text-[10px] gap-1 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10">
                               Normalize Weights
                             </Button>
                           )}
                           <div className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${isRubricValid ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'}`}>
                             {isRubricValid ? <Check className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                             Total: {totalWeight}% {isRubricValid ? '(Valid)' : '(Requires 100%)'}
                           </div>
                         </div>
                      )}
                    </div>
                    
                    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                      <div className="grid grid-cols-[1fr_2fr_100px_40px] gap-2 p-3 bg-black/40 text-xs font-semibold text-gray-400 border-b border-white/5 uppercase">
                        <div>Label</div>
                        <div>Guidance</div>
                        <div className="text-center">Weight (%)</div>
                        <div></div>
                      </div>
                      
                      <div className="flex flex-col">
                        {rubricData.map((row, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr_2fr_100px_40px] gap-2 p-2 border-b border-white/5 items-center hover:bg-white/[0.02]">
                            <Input 
                              value={row.label}
                              onChange={(e) => {
                                const nw = [...rubricData]; nw[idx].label = e.target.value; setRubricData(nw); setRubricConfirmed(false); setRubricEdited(true);
                              }}
                              className="h-8 text-xs bg-transparent border-transparent hover:border-white/20 focus:border-blue-500 focus:bg-[#111] px-2 shadow-none rounded-md"
                            />
                            <Input 
                              value={row.guidance}
                              onChange={(e) => {
                                const nw = [...rubricData]; nw[idx].guidance = e.target.value; setRubricData(nw); setRubricConfirmed(false); setRubricEdited(true);
                              }}
                              className="h-8 text-[11px] text-gray-400 bg-transparent border-transparent hover:border-white/20 focus:border-blue-500 focus:bg-[#111] px-2 shadow-none rounded-md truncate focus:w-[400px] transition-all absolute-focus-trick"
                            />
                            <Input 
                              type="number"
                              value={row.weight}
                              onChange={(e) => {
                                const nw = [...rubricData]; nw[idx].weight = parseInt(e.target.value) || 0; setRubricData(nw); setRubricConfirmed(false); setRubricEdited(true);
                              }}
                              className="h-8 text-xs text-center font-mono font-bold bg-white/5 border border-white/10"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400" onClick={() => {
                               setRubricData(rubricData.filter((_, i) => i !== idx)); setRubricConfirmed(false); setRubricEdited(true);
                            }}>
                              <Trash2 className="w-3.5 h-3.5"/>
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="p-2 border-t border-white/5 flex gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => {
                           setRubricData([...rubricData, {key: `criteria_${Date.now()}`, label: 'New Criteria', guidance: 'Description', weight: 0}]);
                           setRubricConfirmed(false);
                        }}>
                          <Plus className="w-3 h-3"/> Add Criteria
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                      <p className="text-xs text-gray-500 max-w-[250px]">Admins must finalize and confirm the scoring weights before proceeding.</p>
                      {rubricConfirmed ? (
                        <div className="flex items-center gap-2 text-sm text-green-400 font-medium px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <Check className="w-4 h-4"/> Rubric Finalized ({totalWeight}%)
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setRubricConfirmed(true)} 
                          disabled={!isRubricValid}
                          className={`gap-2 ${isRubricValid ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                        >
                          <Check className="w-4 h-4"/> Confirm Rubric
                        </Button>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* Step 4: Settings */}
              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Event Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Suggestion Tracking</p>
                        <p className="text-xs text-gray-500 mt-0.5">Track mentor suggestions across rounds</p>
                      </div>
                      <Switch checked={suggestionsEnabled} onCheckedChange={setSuggestionsEnabled} />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Multi-Mentor Review</p>
                        <p className="text-xs text-gray-500 mt-0.5">Allow multiple mentors to review the same team</p>
                      </div>
                      <Switch checked={allowMultiMentor} onCheckedChange={setAllowMultiMentor} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Review & Create</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                      <p><span className="text-gray-500">Event:</span> <strong>{formValues.eventName}</strong></p>
                      <p><span className="text-gray-500">Organizer:</span> {formValues.organizerName}</p>
                      <p><span className="text-gray-500">Date:</span> {formValues.eventDate}</p>
                      <p><span className="text-gray-500">Venue:</span> {formValues.venue}</p>
                      <p><span className="text-gray-500">Type:</span> {formValues.eventType?.replace('_', ' ')}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                      <p className="font-medium">Rounds ({rounds.length})</p>
                      {rounds.map((r) => (
                        <p key={r.roundOrder} className="text-gray-600 dark:text-gray-400 pl-4">
                          {r.roundOrder}. {r.roundName}
                        </p>
                      ))}
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                      <p className="font-medium">Scoring Rubric ({rubricData.length} Criteria)</p>
                      {rubricData.map((r, i) => (
                        <p key={i} className="text-gray-600 dark:text-gray-400 pl-4 text-xs">
                          {r.weight}% â€” {r.label}
                        </p>
                      ))}
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-1">
                      <p><span className="text-gray-500">Suggestions:</span> {suggestionsEnabled ? 'Enabled' : 'Disabled'}</p>
                      <p><span className="text-gray-500">Multi-mentor:</span> {allowMultiMentor ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={nextStep} className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5]">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5]">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

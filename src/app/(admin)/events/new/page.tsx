'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Settings, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const STEPS = [
  { label: 'Basic Info', icon: Calendar },
  { label: 'Rounds', icon: Settings },
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
    { roundName: 'Round 1 — Preliminary', roundOrder: 1 },
  ]);

  const { register, handleSubmit, watch, formState: { errors }, getValues, trigger } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { eventType: 'multi_round' },
  });

  const eventType = watch('eventType');

  const addRound = () => {
    if (rounds.length >= 5) return;
    const order = rounds.length + 1;
    const names = ['', 'Preliminary', 'Semifinals', 'Finals', 'Grand Finale', 'Bonus'];
    setRounds([...rounds, { roundName: `Round ${order} — ${names[order] || 'Round ' + order}`, roundOrder: order }]);
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
    setStep(Math.min(step + 1, STEPS.length - 1));
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

              {/* Step 3: Settings */}
              {step === 2 && (
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

              {/* Step 4: Review */}
              {step === 3 && (
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

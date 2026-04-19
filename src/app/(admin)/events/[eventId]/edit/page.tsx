'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const editEventSchema = z.object({
  eventName: z.string().min(2, 'Event name is required'),
  organizerName: z.string().min(2, 'Organizer name is required'),
  description: z.string().optional().nullable(),
  eventDate: z.string().min(1, 'Event date is required'),
  venue: z.string().min(2, 'Venue is required'),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
});

type EditEventFormData = z.infer<typeof editEventSchema>;

export default function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [allowMultiMentor, setAllowMultiMentor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditEventFormData>({
    resolver: zodResolver(editEventSchema),
  });

  const formStatus = watch('status');

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data } = await apiClient.get(`/events/${eventId}`);
        const event = data.data;
        
        // Populate form
        reset({
          eventName: event.eventName,
          organizerName: event.organizerName,
          description: event.description || '',
          eventDate: event.eventDate,
          venue: event.venue,
          status: event.status,
        });
        
        setSuggestionsEnabled(event.suggestionsEnabled);
        setAllowMultiMentor(event.allowMultiMentorReview);
        setCurrentStatus(event.status);
      } catch {
        toast.error('Failed to load event details');
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [eventId, reset, router]);

  const onSubmit = async (data: EditEventFormData) => {
    setIsSaving(true);
    try {
      await apiClient.patch(`/events/${eventId}`, {
        ...data,
        suggestionsEnabled,
        allowMultiMentorReview: allowMultiMentor,
      });
      toast.success('Event updated successfully');
      router.push(`/events/${eventId}`);
    } catch {
      toast.error('Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isBlockedFromEditing = currentStatus === 'completed' || currentStatus === 'archived';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/events/${eventId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h1>
          <p className="text-sm text-gray-500">Update event details and settings</p>
        </div>
      </div>

      {isBlockedFromEditing ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-500">Editing Disabled</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                This event is currently marked as <strong>{currentStatus}</strong>.
                You cannot modify the details of a completed or archived event.
              </p>
              <Button 
                variant="outline" 
                className="mt-4 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                Return to Event
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input id="eventName" className="h-11" {...register('eventName')} />
                  {errors.eventName && <p className="text-xs text-red-500">{errors.eventName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizerName">Organizer *</Label>
                  <Input id="organizerName" className="h-11" {...register('organizerName')} />
                  {errors.organizerName && <p className="text-xs text-red-500">{errors.organizerName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={3} {...register('description')} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input id="eventDate" type="date" className="h-11" {...register('eventDate')} />
                    {errors.eventDate && <p className="text-xs text-red-500">{errors.eventDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue *</Label>
                    <Input id="venue" className="h-11" {...register('venue')} />
                    {errors.venue && <p className="text-xs text-red-500">{errors.venue.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={formStatus} onValueChange={(v) => setValue('status', v as any)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Note: Marking as completed/archived will lock the event from further edits.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 pt-2">Event Settings</h3>
                
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

              <div className="flex items-center justify-end pt-6 border-t border-gray-100 dark:border-gray-800 gap-3">
                <Button variant="outline" type="button" onClick={() => router.push(`/events/${eventId}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-[#1A56DB] hover:bg-[#1044A5]">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>

            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

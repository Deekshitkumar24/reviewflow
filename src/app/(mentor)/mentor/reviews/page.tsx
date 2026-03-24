'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, ChevronRight, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { VERDICT_CONFIG, type VerdictType } from '@/types';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ReviewItem {
  id: string;
  teamId: string;
  teamName: string;
  projectTitle: string;
  roundName: string;
  totalScore: number | null;
  verdict: VerdictType | null;
  isDraft: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export default function MentorReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Backend enforces: mentors see only their own reviews
      const { data } = await apiClient.get('/reviews?limit=100&orderBy=createdAt&order=desc');
      setReviews(data.data ?? []);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const submitted = reviews.filter((r) => !r.isDraft);
  const drafts = reviews.filter((r) => r.isDraft);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{submitted.length} submitted · {drafts.length} draft{drafts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchReviews} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Start reviewing teams from your lab queue.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {/* Drafts first */}
          {drafts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">Drafts</p>
              {drafts.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} onClick={() => router.push(`/mentor/review/${review.teamId}?reviewId=${review.id}`)} />
              ))}
            </div>
          )}
          {submitted.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">Submitted</p>
              {submitted.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} onClick={() => router.push(`/mentor/review/${review.teamId}?reviewId=${review.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, index, onClick }: { review: ReviewItem; index: number; onClick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{review.teamName}</h3>
              {review.isDraft
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Draft</span>
                : review.verdict && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: VERDICT_CONFIG[review.verdict].bg, color: VERDICT_CONFIG[review.verdict].color }}>
                    {VERDICT_CONFIG[review.verdict].label}
                  </span>
                )
              }
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{review.projectTitle} · {review.roundName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!review.isDraft && review.totalScore != null && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{review.totalScore.toFixed(1)}</span>
              </div>
            )}
            <span className="text-xs text-gray-400">
              {review.submittedAt
                ? formatDistanceToNow(new Date(review.submittedAt), { addSuffix: true })
                : formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

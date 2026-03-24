'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Clock, ClipboardList, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VERDICT_CONFIG, type VerdictType } from '@/types';

interface ReviewItem {
  id: string;
  teamName: string;
  projectTitle: string;
  labName: string;
  roundName: string;
  compositeScore: number;
  verdict: VerdictType;
  isDraft: boolean;
  reviewedAt: string;
}

export default function MentorReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setReviews([
        { id: '1', teamName: 'AlgoX', projectTitle: 'AI Code Review', labName: 'Lab 101', roundName: 'Round 1', compositeScore: 82.5, verdict: 'selected', isDraft: false, reviewedAt: '2026-04-15T10:30:00' },
        { id: '2', teamName: 'ByteHackers', projectTitle: 'Collaborative IDE', labName: 'Lab 101', roundName: 'Round 1', compositeScore: 71.3, verdict: 'shortlisted', isDraft: false, reviewedAt: '2026-04-15T11:15:00' },
        { id: '3', teamName: 'CyberGuards', projectTitle: 'Intrusion Detection', labName: 'Lab 101', roundName: 'Round 1', compositeScore: 58.0, verdict: 'hold', isDraft: true, reviewedAt: '2026-04-15T11:45:00' },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  const filtered = reviews.filter(r =>
    r.teamName.toLowerCase().includes(search.toLowerCase()) ||
    r.projectTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">{reviews.length} reviews submitted</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search reviews..." className="pl-10 h-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />No reviews yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((review, i) => {
            const vc = VERDICT_CONFIG[review.verdict];
            return (
              <motion.div key={review.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => router.push(`/mentor/review/${review.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{review.teamName}</h3>
                        <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: vc.bg, color: vc.color }}>
                          {vc.label}
                        </Badge>
                        {review.isDraft && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Draft</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{review.projectTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{review.labName} · {review.roundName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{review.compositeScore.toFixed(1)}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(review.reviewedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

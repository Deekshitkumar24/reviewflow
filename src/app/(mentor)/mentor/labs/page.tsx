'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, FlaskConical, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface LabItem {
  id: string;
  labName: string;
  building: string;
  teamCount: number;
  reviewedCount: number;
  status: string;
}

export default function MentorLabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLabs([
        { id: '1', labName: 'Lab 101', building: 'Block A, 1st Floor', teamCount: 7, reviewedCount: 3, status: 'in_progress' },
        { id: '2', labName: 'Lab 102', building: 'Block A, 1st Floor', teamCount: 7, reviewedCount: 1, status: 'active' },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Labs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Labs assigned to you for the current round</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : labs.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-500">No labs assigned yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {labs.map((lab, i) => {
            const progress = lab.teamCount > 0 ? Math.round((lab.reviewedCount / lab.teamCount) * 100) : 0;
            return (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card
                  className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => router.push(`/mentor/labs/${lab.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{lab.labName}</h3>
                          <p className="text-xs text-gray-500">{lab.building}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={
                        progress === 100 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }>
                        {progress === 100 ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {progress === 100
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />
                      }
                      <span>{lab.reviewedCount}/{lab.teamCount} teams reviewed</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-2.5" />
                      <span className="text-sm font-bold text-[#1A56DB] w-10 text-right">{progress}%</span>
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

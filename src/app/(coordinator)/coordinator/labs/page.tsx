'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, Users, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CoordLab {
  id: string;
  labName: string;
  building: string;
  teamCount: number;
  checkedInCount: number;
}

export default function CoordinatorLabsPage() {
  const [labs, setLabs] = useState<CoordLab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLabs([
        { id: '1', labName: 'Lab 101', building: 'Block A, 1st Floor', teamCount: 7, checkedInCount: 5 },
        { id: '2', labName: 'Lab 102', building: 'Block A, 1st Floor', teamCount: 7, checkedInCount: 3 },
        { id: '3', labName: 'Lab 201', building: 'Block A, 2nd Floor', teamCount: 6, checkedInCount: 6 },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lab Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Attendance status by lab</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => {
            const allPresent = lab.checkedInCount === lab.teamCount;
            return (
              <Card key={lab.id} className="border border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.labName}</h3>
                      <p className="text-xs text-gray-500">{lab.building}</p>
                    </div>
                    <Badge variant="secondary" className={
                      allPresent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }>
                      {allPresent ? 'All Present' : `${lab.teamCount - lab.checkedInCount} pending`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {lab.checkedInCount}/{lab.teamCount} teams checked in
                    </span>
                    {allPresent && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

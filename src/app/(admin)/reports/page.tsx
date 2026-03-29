import { Metadata } from 'next';
import { db } from '@/db';
import { reviews, teams, labs, suggestions, suggestionStatusLogs } from '@/db/schema';
import { isNull, eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { Download, Activity, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports & Analytics | ReviewFlow Admin',
  description: 'View event metrics, suggestion compliance, and export reports',
};


async function getAnalyticsData() {
  const [reviewsList, teamsList, labsList, suggestionsList, statusLogsList] = await Promise.all([
    db.query.reviews.findMany({
      where: eq(reviews.isDraft, false),
      with: { round: true, lab: true }
    }),
    db.query.teams.findMany({ where: isNull(teams.deletedAt) }),
    db.query.labs.findMany({ where: isNull(labs.deletedAt) }),
    db.query.suggestions.findMany(),
    db.query.suggestionStatusLogs.findMany({ 
        with: { 
            suggestion: { with: { review: { with: { team: true } } } }, 
            round: true 
        } 
    })
  ]);

  const teamsCount = teamsList.length;
  const labsCount = labsList.length;

  // Transform reviews for charts
  const verdicts = reviewsList.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const verdictData = Object.entries(verdicts).map(([name, value]) => ({ name, value }));

  const labProgress = reviewsList.reduce((acc, r) => {
    const labName = r.lab?.labName || 'Unknown';
    acc[labName] = (acc[labName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const labData = Object.entries(labProgress).map(([name, completed]) => ({ name, completed }));

  const roundScores = reviewsList.reduce((acc, r) => {
    const roundName = r.round?.roundName || 'Unknown';
    if (!acc[roundName]) {
      acc[roundName] = { total: 0, count: 0 };
    }
    acc[roundName].total += Number(r.compositeScore || 0);
    acc[roundName].count += 1;
    return acc;
  }, {} as Record<string, { total: number, count: number }>);

  const scoreData = Object.entries(roundScores).map(([name, data]) => ({
    name,
    average: Number((data.total / data.count).toFixed(2))
  }));

  // Suggestion Compliance Data
  const compliance = {
    completed: statusLogsList.filter(s => s.status === 'completed').length,
    partial: statusLogsList.filter(s => s.status === 'partial').length,
    notDone: statusLogsList.filter(s => s.status === 'not_done').length,
    total: suggestionsList.length,
    pending: suggestionsList.length - statusLogsList.length
  };

  const topUnresolved = statusLogsList
    .filter(s => s.status === 'not_done')
    .slice(0, 5)
    .map(s => ({
      id: s.id,
      team: s.suggestion?.review?.team?.teamName || 'Unknown Team',
      text: s.suggestion?.text || 'No text',
      round: s.round?.roundName || 'Unknown Round'
    }));

  return { verdictData, labData, scoreData, stats: { teams: teamsCount, labs: labsCount, reviews: reviewsList.length }, compliance, topUnresolved };
}

export default async function ReportsPage() {
  const data = await getAnalyticsData();

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Monitor performance, suggestions, and export data.</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/api/v1/reports/export?eventId=all&type=teams" target="_blank">
             <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Teams</Button>
          </Link>
          <Link href="/api/v1/reports/export?eventId=all&type=reviews" target="_blank">
             <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Reviews</Button>
          </Link>
          <Link href="/api/v1/reports/export?eventId=all&type=results" target="_blank">
             <Button><Download className="mr-2 h-4 w-4" /> Export Results</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.reviews}</div>
            <p className="text-xs text-muted-foreground">Finalized submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.compliance.total}</div>
            <p className="text-xs text-muted-foreground">Generated by mentors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suggestions Resolved</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{data.compliance.completed}</div>
            <p className="text-xs text-muted-foreground">Marked as completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suggestions Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{data.compliance.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting check in next round</p>
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts 
        verdictData={data.verdictData} 
        scoreData={data.scoreData} 
        labData={data.labData} 
      />

      <div className="mt-8">
        <h2 className="text-2xl font-bold font-heading mb-4">Suggestion Compliance Risk</h2>
        <Card>
          <CardHeader>
             <CardTitle>Top Unresolved Suggestions</CardTitle>
             <CardDescription>Mentors explicitly marked these as &quot;Not Done&quot; in recent round verifications.</CardDescription>
          </CardHeader>
          <CardContent>
             {data.topUnresolved.length === 0 ? (
               <p className="text-muted-foreground text-sm">No unresolved suggestions found.</p>
             ) : (
               <div className="space-y-4">
                 {data.topUnresolved.map(u => (
                    <div key={u.id} className="flex flex-col space-y-1 p-4 border rounded-md">
                       <div className="flex justify-between items-center">
                         <span className="font-medium text-sm">{u.team}</span>
                         <Badge variant="destructive">Not Done</Badge>
                       </div>
                       <p className="text-sm text-foreground">{u.text}</p>
                       <span className="text-xs text-muted-foreground">Verified in: {u.round}</span>
                    </div>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

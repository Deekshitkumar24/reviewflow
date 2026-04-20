'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, FileText, CheckCircle, BarChart3, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function AutoReportPrintView() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || 'all';

  const [loadingStep, setLoadingStep] = useState(0);
  const [reportData, setReportData] = useState<any>(null);
  const [errorDesc, setErrorDesc] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchReport() {
      try {
        setLoadingStep(1); // "Fetching data..."
        
        // Artificial delay for UX
        await new Promise(res => setTimeout(res, 800));
        if (!isMounted) return;
        setLoadingStep(2); // "Analyzing results..."

        const res = await fetch('/api/v1/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });
        
        const data = await res.json();
        
        if (!isMounted) return;
        setLoadingStep(3); // "Generating insights..."
        
        await new Promise(res => setTimeout(res, 800));

        if (data.error) throw new Error(data.message);
        
        setReportData(data.result);
      } catch (err: any) {
        if (isMounted) setErrorDesc(err.message || 'Failed to generate report.');
      }
    }

    fetchReport();

    return () => { isMounted = false; };
  }, [eventId]);

  useEffect(() => {
    if (reportData) {
      // Small delay to ensure Recharts SVG + Fonts fully paint to DOM
      const timer = setTimeout(() => {
        setRenderComplete(true);
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reportData]);

  if (errorDesc) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
         <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
         <h2 className="text-xl font-bold text-gray-900 mb-2">Generation Failed</h2>
         <p className="text-gray-500">{errorDesc}</p>
      </div>
    );
  }

  if (!reportData) {
    const steps = [
      { step: 1, text: "Fetching data..." },
      { step: 2, text: "Analyzing results..." },
      { step: 3, text: "Generating insights..." }
    ];

    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8 @media print { hidden }">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
               <Loader2 className="w-8 h-8 text-blue-600 animate-spin absolute" />
               <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">AI Report Generator</h2>
            <div className="space-y-4 w-full">
               {steps.map((s) => {
                 const isActive = loadingStep === s.step;
                 const isDone = loadingStep > s.step;
                 return (
                   <div key={s.step} className="flex items-center justify-between text-sm">
                      <span className={isActive ? 'text-blue-600 font-medium' : isDone ? 'text-gray-900' : 'text-gray-400'}>
                        {s.text}
                      </span>
                      {isDone && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {isActive && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                   </div>
                 );
               })}
            </div>
         </div>
      </div>
    );
  }

  // Formatting Recharts payload for Top Performers as a bar chart
  const chartData = reportData.topPerformers.map((t: any) => ({
    name: t.name.length > 15 ? t.name.substring(0,15) + '...' : t.name,
    score: t.average
  }));

  return (
    <div className={`min-h-screen bg-white text-black print:bg-white print:text-black p-8 sm:p-12 max-w-5xl mx-auto font-sans transition-opacity duration-300 ${renderComplete ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* 1. Header */}
      <header className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
         <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Event Analytical Report</h1>
            <h2 className="text-xl font-medium text-gray-600">{reportData.meta.title}</h2>
         </div>
         <div className="text-right text-sm text-gray-500 font-medium">
            <p className="flex items-center justify-end gap-1"><Sparkles className="w-3.5 h-3.5" /> Generated by AI Report Engine</p>
            <p>{new Date(reportData.meta.generatedAt).toLocaleString()}</p>
         </div>
      </header>

      <main className="space-y-10">
        {/* 2. Executive Summary */}
        <section>
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> 1. Executive Summary</h3>
           <p className="text-lg leading-relaxed text-gray-900 font-medium">{reportData.ai.executiveSummary}</p>
        </section>

        {/* 3. Participation Stats */}
        <section>
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> 2. Participation Metrics</h3>
           <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 print:bg-white print:border-gray-300">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Total Teams</p>
                 <p className="text-3xl font-black">{reportData.stats.participation.totalTeams}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 print:bg-white print:border-gray-300">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Active Labs</p>
                 <p className="text-3xl font-black">{reportData.stats.participation.totalLabs}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 print:bg-white print:border-gray-300">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Evaluations Logged</p>
                 <p className="text-3xl font-black">{reportData.stats.participation.totalReviews}</p>
              </div>
           </div>
        </section>

        {/* 4. Scoring Analysis */}
        <section>
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> 3. Scoring Analysis</h3>
           <div className="flex gap-8 items-center border border-gray-200 rounded-lg p-6 print:border-gray-300">
              <div className="text-center pr-8 border-r border-gray-200">
                 <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Global Avg Score</p>
                 <p className="text-5xl font-black">{reportData.scoring.averageScore}</p>
                 <p className="text-xs text-gray-400 mt-2">out of 100</p>
              </div>
              <div className="flex-1 h-48">
                 {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                     <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                       <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                       <Bar dataKey="score" fill="#111" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex items-center justify-center text-gray-400">Not enough data for chart</div>
                 )}
              </div>
           </div>
        </section>

        {/* 5. Top Performers */}
        <section>
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4">4. Top Performers Ranking</h3>
           {reportData.topPerformers.length > 0 ? (
             <div className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                     <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                     <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Team Name</th>
                     <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Composite Score</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {reportData.topPerformers.map((t: any, idx: number) => (
                     <tr key={idx}>
                       <td className="px-4 py-3 font-semibold text-gray-500">#{idx + 1}</td>
                       <td className="px-4 py-3 font-bold text-gray-900">{t.name}</td>
                       <td className="px-4 py-3 font-mono font-bold text-right">{t.average.toFixed(1)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           ) : (
             <p className="text-gray-500 italic">No score data logged yet.</p>
           )}
        </section>

        {/* 6. Anomalies */}
        <section>
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 5. Detected Anomalies</h3>
           <div className="border-l-4 border-black pl-4 py-1">
              {reportData.anomalies.length > 0 ? (
                <ul className="space-y-3">
                  {reportData.anomalies.map((a: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700">{a}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No significant anomalies or deviations detected during this event.</p>
              )}
           </div>
        </section>

        {/* 7. Recommendations */}
        <section className="print:break-inside-avoid">
           <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> 6. AI Recommendations</h3>
           <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 print:bg-white print:border-gray-300">
              <ul className="space-y-4">
                 {reportData.ai.recommendations.map((r: string, idx: number) => (
                   <li key={idx} className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                      <p className="text-sm font-medium text-gray-900 pt-0.5">{r}</p>
                   </li>
                 ))}
              </ul>
           </div>
        </section>
      </main>

    </div>
  );
}

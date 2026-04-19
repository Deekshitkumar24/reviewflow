"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid } from "recharts";

interface AnalyticsChartsProps {
  verdictData: { name: string; value: number }[];
  scoreData: { name: string; average: number }[];
  labData: { name: string; completed: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const TOOLTIP_STYLE = { backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' };

export function AnalyticsCharts({ verdictData, scoreData, labData }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. AreaChart (Score Trend Volume) */}
      <Card className="bg-[#111] border-white/5">
        <CardHeader>
          <CardTitle className="text-gray-200">Score Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {scoreData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" domain={[0, 'dataMax + 10']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
                  </AreaChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

      {/* 2. BarChart (Reviews by Lab) */}
      <Card className="bg-[#111] border-white/5">
        <CardHeader>
          <CardTitle className="text-gray-200">Reviews Completed by Lab</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {labData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={labData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="completed" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={true} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

      {/* 3. PieChart (Verdict Distribution) */}
      <Card className="bg-[#111] border-white/5">
        <CardHeader>
          <CardTitle className="text-gray-200">Verdict Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {verdictData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      stroke="rgba(0,0,0,0)"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {verdictData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

      {/* 4. LineChart (Average Score Trend) */}
      <Card className="bg-[#111] border-white/5">
        <CardHeader>
          <CardTitle className="text-gray-200">Average Score Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {scoreData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis domain={[0, 60]} tick={{ fontSize: 12, fill: '#666' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#fff' }} />
                    <Line type="stepAfter" dataKey="average" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#111', strokeWidth: 2 }} activeDot={{ r: 8 }} isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

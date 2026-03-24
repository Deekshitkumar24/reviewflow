"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface AnalyticsChartsProps {
  verdictData: { name: string; value: number }[];
  scoreData: { name: string; average: number }[];
  labData: { name: string; completed: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export function AnalyticsCharts({ verdictData, scoreData, labData }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Verdict Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {verdictData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {verdictData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Score by Round</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {scoreData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 60]} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="average" stroke="#8884d8" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Reviews Completed by Lab</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
             {labData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">No data yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={labData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="completed" fill="#00C49F" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

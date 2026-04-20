"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/types/ai";
import { AILoadingState } from "./AILoadingState";
import { AIErrorState } from "./AIErrorState";
import { AIEmptyState } from "./AIEmptyState";
import { AIBadge } from "./AIBadge";
import { AlertTriangle, AlertCircle, Info, RefreshCw, CheckCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function AlertsPanel({ eventId }: { eventId?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/v1/ai/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId || "all" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      
      const sorted = (data.alerts || []).sort((a: Alert, b: Alert) => {
        const order = { critical: 1, warning: 2, info: 3 };
        return order[a.severity] - order[b.severity];
      });
      setAlerts(sorted);
    } catch (err: any) {
      setError(true);
      toast.error(err.message || "Failed to load real-time alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleResolve = (id: string) => {
    setResolving(id);
    setTimeout(() => {
        setAlerts((prev) => prev.filter(a => a.id !== id));
        setResolving(null);
    }, 600);
  };

  if (loading && alerts.length === 0) return <AILoadingState />;
  if (error) return <AIErrorState onRetry={fetchAlerts} message="Failed to load real-time alerts." />;

  return (
    <div className="flex flex-col bg-[#111] border border-white/5 rounded-xl overflow-hidden h-full">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-white">System Alerts</h3>
            <AIBadge />
        </div>
        <button 
          onClick={fetchAlerts}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
          title="Run Check Now"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[600px] min-h-[300px]">
        {alerts.length === 0 ? (
          <AIEmptyState message="All clear. No issues detected." />
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id}
              className={`p-3 rounded-lg border-l-4 bg-black/50 transition-opacity ${
                resolving === alert.id ? "opacity-50" : "opacity-100"
              } ${
                alert.severity === "critical" ? "border-l-red-500 border-y border-r border-red-500/20" :
                alert.severity === "warning" ? "border-l-amber-500 border-y border-r border-amber-500/20" :
                "border-l-blue-500 border-y border-r border-blue-500/20"
              }`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {alert.severity === "critical" && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {alert.severity === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {alert.severity === "info" && <Info className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 leading-snug mb-1.5">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate mr-2">
                      {alert.affectedEntity} • {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </span>
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolving === alert.id}
                      className="text-xs font-medium flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Inline Notification Bell variant for headers
export function TopbarAlertsBadge() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  useEffect(() => {
    const fetchA = async () => {
      try {
        const res = await fetch("/api/v1/ai/alerts", { method: "POST" });
        const data = await res.json();
        setAlerts((data.alerts || []).filter((a: Alert) => a.severity === "critical" || a.severity === "warning"));
      } catch (e) {}
    };
    fetchA();
    const int = setInterval(fetchA, 5 * 60 * 1000);
    return () => clearInterval(int);
  }, []);

  const hasCritical = alerts.some(a => a.severity === "critical");

  return (
    <div className="relative inline-flex p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer group">
      <Bell className="w-5 h-5 text-gray-300" />
      {alerts.length > 0 && (
        <>
          {hasCritical && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-black"></span>
            </span>
          )}
          {!hasCritical && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-black"></span>
            </span>
          )}
        </>
      )}
      
      {/* Tooltip on hover for simplicity (or can be dropdown) */}
      <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#111] border border-white/10 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
        <h4 className="text-xs font-semibold text-gray-300 mb-2 border-b border-white/5 pb-2">Top Alerts</h4>
        {alerts.length === 0 ? (
          <p className="text-xs text-gray-500">No warnings or critical issues.</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className="text-xs text-gray-300 truncate">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                {a.type}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Activity, Server, Zap, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export function StatCards({ latestMetric, servers, policy, mode, isScaling }) {
  const rps = latestMetric?.rps || 0;
  const activeConns = latestMetric?.activeConnections || 0;
  const avgLatency = latestMetric?.avgLatencyMs || 0;
  const p95Latency = latestMetric?.p95LatencyMs || 0;
  const errorRate = latestMetric?.errorRate || 0;
  const currentCount = servers?.length || 0;
  const minCount = policy?.minServers || 2;
  const maxCount = policy?.maxServers || 10;

  const cards = [
    {
      title: 'Requests / Sec',
      value: rps.toLocaleString(),
      subtext: `${(errorRate * 100).toFixed(1)}% error rate`,
      icon: Activity,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      span: '',
    },
    {
      title: 'Active Connections',
      value: activeConns.toLocaleString(),
      subtext: 'In-flight sockets',
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      span: '',
    },
    {
      title: 'Response Latency',
      value: `${avgLatency} ms`,
      subtext: `p95: ${p95Latency} ms`,
      icon: Clock,
      color: avgLatency > 400 ? 'text-rose-400' : 'text-blue-400',
      bg: avgLatency > 400 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-500/10 border-blue-500/20',
      span: '',
    },
    {
      title: 'Fleet Capacity',
      value: `${currentCount} / ${maxCount}`,
      subtext: `Min fleet: ${minCount}`,
      icon: Server,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      span: '',
    },
    {
      title: 'Autoscaler State',
      value: isScaling ? 'Scaling...' : mode === 'paused' ? 'Paused' : 'Active (Auto)',
      subtext: isScaling ? 'Adjusting fleet' : 'Loop running (5s)',
      icon: mode === 'paused' ? AlertTriangle : ShieldCheck,
      color: isScaling ? 'text-purple-400 animate-pulse' : mode === 'paused' ? 'text-amber-400' : 'text-teal-400',
      bg: isScaling ? 'bg-purple-500/10 border-purple-500/20' : 'bg-slate-800/50 border-slate-700/50',
      span: 'col-span-2 sm:col-span-1 lg:col-span-1',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-3 sm:p-4 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.01] ${card.bg} ${card.span}`}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${card.color}`} />
            </div>
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-0.5 sm:mb-1 truncate">
              {card.value}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 truncate">{card.subtext}</div>
          </div>
        );
      })}
    </div>
  );
}

export default StatCards;

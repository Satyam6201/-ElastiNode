import React from 'react';
import { Activity, Server, Zap, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export function StatCards({ latestMetric, servers, policy, mode, isScaling }) {
  const rps = latestMetric?.rps || 0;
  const activeConns = latestMetric?.activeConnections || 0;
  const avgLatency = latestMetric?.avgLatencyMs || 0;
  const p95Latency = latestMetric?.p95LatencyMs || 0;
  const errorRate = latestMetric?.errorRate || 0;
  const currentCount = servers?.length || 0;
  const minCount = policy?.minServers || 2;
  const maxCount = policy?.maxServers || 10;
  const capacityPercent = Math.min(100, Math.round((currentCount / maxCount) * 100));

  const cards = [
    {
      title: 'Throughput',
      value: rps.toLocaleString(),
      unit: 'req/s',
      detail: `${(errorRate * 100).toFixed(1)}% error rate`,
      icon: Activity,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      span: '',
    },
    {
      title: 'Active Connections',
      value: activeConns.toLocaleString(),
      unit: 'sockets',
      detail: 'In-flight client sockets',
      icon: Zap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      span: '',
    },
    {
      title: 'Average Latency',
      value: avgLatency,
      unit: 'ms',
      detail: `p95 percentile: ${p95Latency} ms`,
      icon: Clock,
      iconColor: avgLatency > 400 ? 'text-rose-400' : 'text-sky-400',
      iconBg: avgLatency > 400 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-sky-500/10 border-sky-500/20',
      span: '',
    },
    {
      title: 'Fleet Capacity',
      value: `${currentCount} / ${maxCount}`,
      unit: 'nodes',
      detail: `Min baseline: ${minCount} nodes`,
      icon: Server,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      span: '',
      hasProgress: true,
      progress: capacityPercent,
    },
    {
      title: 'Autoscaler',
      value: isScaling ? 'Scaling Fleet' : mode === 'paused' ? 'Paused' : 'Active Loop',
      unit: mode === 'paused' ? 'manual' : '5s eval',
      detail: isScaling ? 'Adjusting backend node count' : 'Policy bounds nominal',
      icon: mode === 'paused' ? AlertCircle : ShieldCheck,
      iconColor: isScaling ? 'text-purple-400' : mode === 'paused' ? 'text-amber-400' : 'text-emerald-400',
      iconBg: isScaling ? 'bg-purple-500/10 border-purple-500/20' : mode === 'paused' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20',
      span: 'col-span-2 sm:col-span-1 lg:col-span-1',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all rounded-lg p-3.5 sm:p-4 flex flex-col justify-between ${card.span}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-md border ${card.iconBg} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>

            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-mono font-semibold tracking-tight text-zinc-100">
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-xs font-mono text-zinc-500">
                    {card.unit}
                  </span>
                )}
              </div>
            </div>

            {card.hasProgress ? (
              <div className="mt-2">
                <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1.5 truncate">
                  {card.detail}
                </div>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-zinc-400 mt-2 truncate">
                {card.detail}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StatCards;

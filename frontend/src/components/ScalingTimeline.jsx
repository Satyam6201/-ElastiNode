import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sliders,
  History,
  Filter,
  ArrowRight,
  Clock,
} from 'lucide-react';

export function ScalingTimeline({ events = [] }) {
  const [filter, setFilter] = useState('ALL');

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events;
    return events.filter((ev) => ev.type === filter);
  }, [events, filter]);

  const getEventMeta = (type) => {
    switch (type) {
      case 'SCALE_OUT':
        return {
          icon: TrendingUp,
          label: 'Scale Out',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          dot: 'bg-emerald-400',
        };
      case 'SCALE_IN':
        return {
          icon: TrendingDown,
          label: 'Scale In',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          dot: 'bg-amber-400',
        };
      case 'SERVER_FAILED':
        return {
          icon: AlertTriangle,
          label: 'Node Failed',
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          dot: 'bg-rose-400',
        };
      case 'POLICY_CHANGED':
      default:
        return {
          icon: Sliders,
          label: 'Policy Config',
          color: 'text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/20',
          dot: 'bg-sky-400',
        };
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Scaling Audit Log
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {events.length} events
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable stream of autoscaler decisions and health adjustments
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 rounded-md p-0.5">
          <Filter className="w-3 h-3 text-zinc-500 ml-1.5 mr-0.5" />
          {[
            { id: 'ALL', label: 'All' },
            { id: 'SCALE_OUT', label: 'Out' },
            { id: 'SCALE_IN', label: 'In' },
            { id: 'SERVER_FAILED', label: 'Failures' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filter === item.id
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-2">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((ev, i) => {
            const meta = getEventMeta(ev.type);
            const Icon = meta.icon;
            const timeStr = new Date(ev.ts).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={ev.id || i}
                className="p-3 rounded-md bg-zinc-950/60 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors flex items-start gap-3 text-xs"
              >
                <div className={`p-1.5 rounded-md border ${meta.bg} shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-xs ${meta.color}`}>
                        {meta.label}
                      </span>
                      {ev.serverId && (
                        <span className="font-mono text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-700/50">
                          {ev.serverId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {ev.serversBefore != null && ev.serversAfter != null && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 my-1">
                      <span className="text-zinc-400">Cluster Size:</span>
                      <span className="font-semibold text-zinc-200">{ev.serversBefore}</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                      <span className="font-semibold text-zinc-100">{ev.serversAfter}</span>
                      <span className="text-zinc-500 text-[11px]">
                        ({ev.serversAfter > ev.serversBefore ? '+' : ''}
                        {ev.serversAfter - ev.serversBefore} node)
                      </span>
                    </div>
                  )}

                  <p className="text-zinc-400 text-[11px] leading-relaxed break-words mt-1">
                    {ev.reason}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No scaling events match the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
}

export default ScalingTimeline;

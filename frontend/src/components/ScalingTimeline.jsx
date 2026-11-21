import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertOctagon, Sliders, History } from 'lucide-react';

export function ScalingTimeline({ events }) {
  const getEventBadge = (type) => {
    switch (type) {
      case 'SCALE_OUT':
        return {
          icon: ArrowUpRight,
          label: 'SCALE OUT',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        };
      case 'SCALE_IN':
        return {
          icon: ArrowDownRight,
          label: 'SCALE IN',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      case 'SERVER_FAILED':
        return {
          icon: AlertOctagon,
          label: 'SERVER FAILED',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        };
      case 'POLICY_CHANGED':
      default:
        return {
          icon: Sliders,
          label: 'POLICY',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        };
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-5 backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400 shrink-0" />
            Scaling Event History
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">Audit trail of autoscaler actions & crash recoveries</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[320px] sm:max-h-[380px] lg:max-h-[440px] pr-1 space-y-2.5 sm:space-y-3">
        {events && events.length > 0 ? (
          events.map((ev, i) => {
            const badge = getEventBadge(ev.type);
            const Icon = badge.icon;
            const timeStr = new Date(ev.ts).toLocaleTimeString();

            return (
              <div
                key={ev.id || i}
                className="p-2.5 sm:p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5 sm:gap-3 text-xs transition-all hover:bg-slate-800/70"
              >
                <div className={`p-1.5 rounded-md border shrink-0 ${badge.color} mt-0.5`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-[11px] sm:text-xs text-slate-200">{badge.label}</span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0">{timeStr}</span>
                  </div>
                  <div className="text-slate-300 font-medium truncate text-[11px] sm:text-xs">
                    {ev.serverId && <span className="text-teal-400 font-mono mr-1.5">{ev.serverId}</span>}
                    {ev.serversBefore != null && ev.serversAfter != null && (
                      <span className="text-slate-400 font-mono text-[10px] sm:text-[11px] mr-1.5">
                        ({ev.serversBefore} → {ev.serversAfter})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[10px] sm:text-[11px] mt-0.5 break-words line-clamp-3 sm:line-clamp-2">
                    {ev.reason}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 sm:py-12 text-center text-slate-500 text-xs sm:text-sm">
            No scaling events logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default ScalingTimeline;

import React from 'react';
import { Cpu, Radio, Network, XCircle } from 'lucide-react';

export function ServerGrid({ servers, onDrainServer }) {
  const getStateBadge = (state) => {
    switch (state) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Healthy
          </span>
        );
      case 'draining':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Draining...
          </span>
        );
      case 'starting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Starting
          </span>
        );
      case 'unhealthy':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Unhealthy
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400" />
            Active Backend Fleet
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Dynamic pool managed by Load Balancer and Process Provisioner
          </p>
        </div>
        <span className="self-start sm:self-auto text-[11px] sm:text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {servers.length} node{servers.length !== 1 ? 's' : ''} live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {servers.map((srv) => {
          const cpu = srv.cpu || 0;
          const isDraining = srv.state === 'draining';

          return (
            <div
              key={srv.id}
              className={`relative rounded-lg p-3 sm:p-4 border transition-all duration-300 ${
                isDraining
                  ? 'bg-slate-900/40 border-amber-500/30 opacity-70'
                  : 'bg-slate-800/50 border-slate-700/60 hover:border-teal-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-2.5 sm:mb-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                  <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wide truncate">
                    {srv.id}
                  </span>
                </div>
                {getStateBadge(srv.state)}
              </div>

              <div className="mb-2.5 sm:mb-3">
                <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-400" /> CPU Load
                  </span>
                  <span className="font-mono font-semibold text-slate-200">{cpu}%</span>
                </div>
                <div className="w-full bg-slate-700/50 h-1.5 sm:h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      cpu > 75
                        ? 'bg-rose-500'
                        : cpu > 50
                        ? 'bg-amber-400'
                        : 'bg-teal-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, cpu))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs py-1.5 sm:py-2 border-t border-slate-700/40 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] sm:text-xs">Connections</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {srv.activeConnections || 0} active
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] sm:text-xs">Total Served</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(srv.totalRequests || 0).toLocaleString()} reqs
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 border-t border-slate-700/40">
                <span className="font-mono truncate max-w-[120px] sm:max-w-[140px] flex items-center gap-1">
                  <Network className="w-3 h-3 text-slate-500 shrink-0" />
                  {srv.url ? srv.url.replace('http://', '') : 'internal'}
                </span>

                {!isDraining && onDrainServer && (
                  <button
                    onClick={() => onDrainServer(srv.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors px-2 py-0.5 rounded bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/60"
                    title="Drain and remove server"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Drain
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {servers.length === 0 && (
          <div className="col-span-full py-8 sm:py-12 text-center text-slate-500 text-xs sm:text-sm">
            No servers currently registered in pool.
          </div>
        )}
      </div>
    </div>
  );
}

export default ServerGrid;

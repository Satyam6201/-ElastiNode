import React, { useState, useMemo } from 'react';
import { Cpu, Server, Network, XCircle, Search, LayoutGrid, Table, ArrowUpDown } from 'lucide-react';

export function ServerGrid({ servers = [], onDrainServer }) {
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const filteredServers = useMemo(() => {
    return servers.filter((srv) => {
      const matchesSearch =
        srv.id?.toLowerCase().includes(search.toLowerCase()) ||
        srv.url?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filterState === 'all' || srv.state === filterState;
      return matchesSearch && matchesFilter;
    });
  }, [servers, search, filterState]);

  const statusCounts = useMemo(() => {
    const counts = { all: servers.length, healthy: 0, draining: 0, unhealthy: 0 };
    for (const s of servers) {
      if (s.state === 'healthy') counts.healthy++;
      else if (s.state === 'draining') counts.draining++;
      else counts.unhealthy++;
    }
    return counts;
  }, [servers]);

  const getStateBadge = (state) => {
    switch (state) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Healthy
          </span>
        );
      case 'draining':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Draining
          </span>
        );
      case 'starting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Starting
          </span>
        );
      case 'unhealthy':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Unhealthy
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-300" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Backend Server Fleet
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {servers.length} active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Dynamic instance pool provisioned across local ports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-36 sm:w-44 font-mono"
            />
          </div>

          <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-md p-0.5 text-xs">
            {['all', 'healthy', 'draining'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                  filterState === st
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st} ({statusCounts[st] || 0})
              </button>
            ))}
          </div>

          <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-md p-0.5 text-zinc-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'table' ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' && filteredServers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                <th className="py-2.5 px-3">Node</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Port</th>
                <th className="py-2.5 px-3">CPU Usage</th>
                <th className="py-2.5 px-3">Active Sockets</th>
                <th className="py-2.5 px-3">Total Served</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 font-mono text-xs">
              {filteredServers.map((srv) => {
                const isDraining = srv.state === 'draining';
                const cpu = srv.cpu || 0;
                return (
                  <tr
                    key={srv.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${
                      isDraining ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">
                      {srv.id}
                    </td>
                    <td className="py-2.5 px-3">{getStateBadge(srv.state)}</td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {srv.url ? srv.url.replace('http://', '') : 'internal'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              cpu > 75
                                ? 'bg-rose-500'
                                : cpu > 50
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, cpu))}%` }}
                          />
                        </div>
                        <span>{cpu}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {srv.activeConnections || 0}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {(srv.totalRequests || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!isDraining && onDrainServer && (
                        <button
                          onClick={() => onDrainServer(srv.id)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 transition-colors text-[11px]"
                          title="Drain and remove server"
                        >
                          Drain
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredServers.map((srv) => {
            const cpu = srv.cpu || 0;
            const isDraining = srv.state === 'draining';

            return (
              <div
                key={srv.id}
                className={`rounded-lg p-3.5 border transition-all duration-200 ${
                  isDraining
                    ? 'bg-zinc-900/40 border-amber-500/20 opacity-70'
                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-semibold text-xs sm:text-sm text-zinc-100 tracking-tight truncate">
                      {srv.id}
                    </span>
                  </div>
                  {getStateBadge(srv.state)}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Cpu className="w-3 h-3 text-zinc-500" /> CPU
                    </span>
                    <span className="text-zinc-200 font-semibold">{cpu}%</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        cpu > 75
                          ? 'bg-rose-500'
                          : cpu > 50
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, cpu))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-zinc-800/70 text-zinc-300 font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Sockets</span>
                    <span className="text-zinc-200 font-semibold">
                      {srv.activeConnections || 0} active
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Requests</span>
                    <span className="text-zinc-200 font-semibold">
                      {(srv.totalRequests || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-zinc-800/70">
                  <span className="truncate max-w-[120px] sm:max-w-[140px] flex items-center gap-1">
                    <Network className="w-3 h-3 text-zinc-500 shrink-0" />
                    {srv.url ? srv.url.replace('http://', '') : 'internal'}
                  </span>

                  {!isDraining && onDrainServer && (
                    <button
                      onClick={() => onDrainServer(srv.id)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-rose-400 transition-colors px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-rose-500/10 border border-zinc-700/60"
                      title="Drain and remove server"
                    >
                      <XCircle className="w-3 h-3" />
                      Drain
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredServers.length === 0 && (
        <div className="py-10 text-center text-zinc-500 text-xs sm:text-sm font-mono">
          No backend nodes matching current criteria.
        </div>
      )}
    </div>
  );
}

export default ServerGrid;

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity } from 'lucide-react';

export function RpsChart({ data = [] }) {
  const chartData = (data || []).map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    rps: d.rps || 0,
    activeConnections: d.activeConnections || d.activeConns || 0,
  }));

  const latestRps = chartData.length > 0 ? chartData[chartData.length - 1].rps : 0;
  const latestConns = chartData.length > 0 ? chartData[chartData.length - 1].activeConnections : 0;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Throughput & Active Sockets
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time HTTP requests per second and open client socket count
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-emerald-400 font-semibold">
            {latestRps} req/s
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-amber-400 font-semibold">
            {latestConns} sockets
          </span>
        </div>
      </div>

      <div className="h-60 sm:h-64 lg:h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="connsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#3f3f46',
                  borderRadius: '6px',
                  color: '#f4f4f5',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  paddingTop: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="rps"
                name="RPS (req/s)"
                stroke="#10b981"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#rpsGrad)"
              />
              <Area
                type="monotone"
                dataKey="activeConnections"
                name="Active Sockets"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#connsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs sm:text-sm font-mono">
            Awaiting streaming metric samples...
          </div>
        )}
      </div>
    </div>
  );
}

export default RpsChart;

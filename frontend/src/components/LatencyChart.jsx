import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

export function LatencyChart({ data, policy }) {
  const outCpuThreshold = policy?.outCpu || 70;
  const outLatencyThreshold = policy?.outLatency || 500;

  const chartData = (data || []).map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    avgLatency: d.avgLatencyMs || d.avgLatency || 0,
    p95Latency: d.p95LatencyMs || d.p95Latency || 0,
    cpu: d.cpuAvg || 0,
  }));

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Latency & CPU Pressures</h3>
          <p className="text-[11px] sm:text-xs text-slate-400">Response time (ms) and CPU % with scaling breach threshold</p>
        </div>
      </div>

      <div className="h-56 sm:h-64 lg:h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              <ReferenceLine
                yAxisId="left"
                y={outLatencyThreshold}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{ value: 'p95 Limit', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                yAxisId="right"
                y={outCpuThreshold}
                stroke="#fb923c"
                strokeDasharray="4 4"
                label={{ value: 'CPU Target', fill: '#fb923c', fontSize: 10, position: 'insideTopLeft' }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgLatency"
                name="Avg Latency (ms)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="p95Latency"
                name="p95 Latency (ms)"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cpu"
                name="CPU (%)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs sm:text-sm">
            Waiting for latency and CPU data...
          </div>
        )}
      </div>
    </div>
  );
}

export default LatencyChart;

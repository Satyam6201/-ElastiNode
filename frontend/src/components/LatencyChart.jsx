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
import { Clock } from 'lucide-react';

export function LatencyChart({ data = [], policy }) {
  const outCpuThreshold = policy?.outCpu || 70;
  const outLatencyThreshold = policy?.outLatency || 500;

  const chartData = (data || []).map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    avgLatency: d.avgLatencyMs || d.avgLatency || 0,
    p95Latency: d.p95LatencyMs || d.p95Latency || 0,
    cpu: d.cpuAvg || 0,
  }));

  const latestAvg = chartData.length > 0 ? chartData[chartData.length - 1].avgLatency : 0;
  const latestP95 = chartData.length > 0 ? chartData[chartData.length - 1].p95Latency : 0;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Response Latency & CPU Pressure
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Round-trip latency percentiles and cluster average CPU load
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-sky-400 font-semibold">
            avg {latestAvg}ms
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-violet-400 font-semibold">
            p95 {latestP95}ms
          </span>
        </div>
      </div>

      <div className="h-60 sm:h-64 lg:h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" stroke="#71717a" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#71717a"
                tick={{ fontSize: 10 }}
              />
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

              <ReferenceLine
                yAxisId="left"
                y={outLatencyThreshold}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: 'Limit',
                  fill: '#f43f5e',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <ReferenceLine
                yAxisId="right"
                y={outCpuThreshold}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{
                  value: 'Target',
                  fill: '#f97316',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgLatency"
                name="Avg Latency (ms)"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="p95Latency"
                name="p95 Latency (ms)"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cpu"
                name="CPU (%)"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
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

export default LatencyChart;

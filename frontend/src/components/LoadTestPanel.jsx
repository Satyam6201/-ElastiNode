import React, { useState } from 'react';
import { Flame, Play, CheckCircle2, Loader2 } from 'lucide-react';

export function LoadTestPanel({ onTriggerLoadTest }) {
  const [rps, setRps] = useState(300);
  const [duration, setDuration] = useState(30);
  const [scenario, setScenario] = useState('standard');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleStart = async () => {
    setIsRunning(true);
    setTestResult(null);
    try {
      const res = await onTriggerLoadTest({ rps, duration, scenario });
      setTestResult(res?.message || 'Load test initiated successfully');
      setTimeout(() => {
        setIsRunning(false);
      }, duration * 1000);
    } catch {
      setIsRunning(false);
      setTestResult('Load test failed to start');
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            Live Load Generator (Autocannon)
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Generate synthetic traffic to demonstrate dynamic scaling out and graceful scaling in
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="p-2.5 sm:p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-400 font-medium text-[11px] sm:text-xs">
              Target Throughput
            </span>
            <span className="font-mono font-bold text-teal-400 text-xs sm:text-sm">{rps} RPS</span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={rps}
            disabled={isRunning}
            onChange={(e) => setRps(parseInt(e.target.value, 10))}
            className="w-full accent-teal-400 cursor-pointer h-1.5 sm:h-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>50 RPS</span>
            <span>500 RPS</span>
            <span>1000 RPS</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-400 font-medium text-[11px] sm:text-xs">Test Duration</span>
            <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
              {duration}s
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={duration}
            disabled={isRunning}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 sm:h-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>10s</span>
            <span>45s</span>
            <span>90s</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 col-span-1 sm:col-span-2 lg:col-span-1">
          <label className="text-slate-400 text-[11px] sm:text-xs block mb-2 font-medium">
            Traffic Pattern
          </label>
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {[
              { id: 'standard', label: 'Sustained' },
              { id: 'spike', label: 'Spike (10x)' },
              { id: 'ramp-up', label: 'Ramp Up' },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                disabled={isRunning}
                onClick={() => setScenario(sc.id)}
                className={`py-1.5 px-1 sm:px-2 rounded text-[10px] sm:text-xs font-medium transition-all text-center truncate ${
                  scenario === sc.id
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-2 min-h-[20px]">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Firing traffic against Load Balancer (:8080)...
            </span>
          )}
          {!isRunning && testResult && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {testResult}
            </span>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            isRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-rose-500 text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20 active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Load Test In Progress ({duration}s)
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Launch Load Test
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default LoadTestPanel;

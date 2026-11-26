import React, { useState } from 'react';
import { Play, CheckCircle2, Loader2, Flame } from 'lucide-react';

export function LoadTestPanel({ onTriggerLoadTest }) {
  const [rps, setRps] = useState(300);
  const [duration, setDuration] = useState(30);
  const [scenario, setScenario] = useState('standard');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const presets = [
    { label: 'Light', rps: 100, duration: 15, scenario: 'standard' },
    { label: 'Moderate', rps: 300, duration: 30, scenario: 'standard' },
    { label: 'Surge', rps: 600, duration: 30, scenario: 'spike' },
    { label: 'Stress', rps: 900, duration: 45, scenario: 'ramp-up' },
  ];

  const handleApplyPreset = (p) => {
    if (isRunning) return;
    setRps(p.rps);
    setDuration(p.duration);
    setScenario(p.scenario);
  };

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
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Traffic Benchmark Generator
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Autocannon worker benchmarking load balancer throughput and node autoscaling
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              disabled={isRunning}
              onClick={() => handleApplyPreset(p)}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 disabled:opacity-50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-zinc-400 font-medium">Target Throughput</span>
            <span className="font-mono font-semibold text-emerald-400">{rps} req/s</span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={rps}
            disabled={isRunning}
            onChange={(e) => setRps(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1.5">
            <span>50 RPS</span>
            <span>500 RPS</span>
            <span>1000 RPS</span>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-zinc-400 font-medium">Duration</span>
            <span className="font-mono font-semibold text-amber-400">{duration} seconds</span>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={duration}
            disabled={isRunning}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1.5">
            <span>10s</span>
            <span>45s</span>
            <span>90s</span>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-zinc-400 font-medium">Traffic Curve</span>
            <span className="font-mono text-[11px] text-zinc-400 capitalize">{scenario}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1">
            {[
              { id: 'standard', label: 'Flat' },
              { id: 'spike', label: 'Spike' },
              { id: 'ramp-up', label: 'Ramp' },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                disabled={isRunning}
                onClick={() => setScenario(sc.id)}
                className={`py-1 px-1 rounded text-[11px] font-medium text-center transition-colors ${
                  scenario === sc.id
                    ? 'bg-zinc-700 text-zinc-100 font-semibold border border-zinc-600'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1.5 truncate">
            {scenario === 'standard' && 'Steady rate load'}
            {scenario === 'spike' && '10x sudden influx burst'}
            {scenario === 'ramp-up' && 'Incremental gradual climb'}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs text-zinc-400 flex items-center gap-2 min-h-[24px]">
          {isRunning && (
            <span className="flex items-center gap-2 text-amber-400 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Generating synthetic HTTP load against port 8080...
            </span>
          )}
          {!isRunning && testResult && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {testResult}
            </span>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`w-full sm:w-auto px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            isRunning
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              : 'bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Benchmark ({duration}s)
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Execute Benchmark
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default LoadTestPanel;

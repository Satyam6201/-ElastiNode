import React, { useState, useEffect } from 'react';
import { Sliders, Pause, Play, Plus, Minus, Save, RefreshCw } from 'lucide-react';

export function PolicyForm({ policy, mode, onUpdatePolicy, onTogglePause, onManualScale }) {
  const [formData, setFormData] = useState({
    minServers: 2,
    maxServers: 10,
    outCpu: 70,
    outRps: 100,
    outLatency: 500,
    inCpu: 30,
    inRps: 40,
    cooldownOutSec: 30,
    cooldownInSec: 90,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (policy) {
      setFormData({
        minServers: policy.minServers || 2,
        maxServers: policy.maxServers || 10,
        outCpu: policy.outCpu || 70,
        outRps: policy.outRps || 100,
        outLatency: policy.outLatency || 500,
        inCpu: policy.inCpu || 30,
        inRps: policy.inRps || 40,
        cooldownOutSec: Math.round((policy.cooldownOutMs || 30000) / 1000),
        cooldownInSec: Math.round((policy.cooldownInMs || 90000) / 1000),
      });
    }
  }, [policy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value, 10) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdatePolicy({
        minServers: formData.minServers,
        maxServers: formData.maxServers,
        outCpu: formData.outCpu,
        outRps: formData.outRps,
        outLatency: formData.outLatency,
        inCpu: formData.inCpu,
        inRps: formData.inRps,
        cooldownOutMs: formData.cooldownOutSec * 1000,
        cooldownInMs: formData.cooldownInSec * 1000,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Autoscaling Policy & Fleet Controls
            </h3>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border ${
                mode === 'paused'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {mode === 'paused' ? 'Paused' : 'Auto Active'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Threshold evaluation loop and manual cluster capacity overrides
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePause}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              mode === 'paused'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700/80 hover:bg-zinc-700'
            }`}
          >
            {mode === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Autoscaling
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause Autoscaling
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onManualScale('out', 1)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-700 flex items-center gap-1"
            title="Manual Scale Out +1 Node"
          >
            <Plus className="w-3.5 h-3.5" /> +1 Node
          </button>

          <button
            type="button"
            onClick={() => onManualScale('in', 1)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-700 flex items-center gap-1"
            title="Manual Scale In -1 Node"
          >
            <Minus className="w-3.5 h-3.5" /> -1 Node
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Cluster Bounds
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                Minimum Fleet Size
              </label>
              <input
                type="number"
                name="minServers"
                min="1"
                max="20"
                value={formData.minServers}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                Maximum Fleet Size
              </label>
              <input
                type="number"
                name="maxServers"
                min="1"
                max="30"
                value={formData.maxServers}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Scale-Out Trigger Thresholds (ANY breaches)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                CPU Utilization (&gt; %)
              </label>
              <input
                type="number"
                name="outCpu"
                min="10"
                max="95"
                value={formData.outCpu}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                Throughput (&gt; RPS / Node)
              </label>
              <input
                type="number"
                name="outRps"
                min="10"
                max="5000"
                value={formData.outRps}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                p95 Latency (&gt; ms)
              </label>
              <input
                type="number"
                name="outLatency"
                min="50"
                max="5000"
                value={formData.outLatency}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Scale-In Thresholds & Cooldown Delays
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                CPU Idle (&lt; %)
              </label>
              <input
                type="number"
                name="inCpu"
                min="5"
                max="50"
                value={formData.inCpu}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                Scale Out Cooldown (sec)
              </label>
              <input
                type="number"
                name="cooldownOutSec"
                min="5"
                max="300"
                value={formData.cooldownOutSec}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-md border border-zinc-800/80">
              <label className="text-zinc-400 block mb-1 text-xs font-medium">
                Scale In Cooldown (sec)
              </label>
              <input
                type="number"
                name="cooldownInSec"
                min="10"
                max="600"
                value={formData.cooldownInSec}
                onChange={handleChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 font-mono text-xs focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-mono font-medium">
                Policy parameters committed successfully.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

export default PolicyForm;

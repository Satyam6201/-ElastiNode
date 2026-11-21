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
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400 shrink-0" />
            Scaling Policy & Controls
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">Configure auto-scaling triggers and manual overrides</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={onTogglePause}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'paused'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {mode === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Auto
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause Auto
              </>
            )}
          </button>

          <button
            onClick={() => onManualScale('out', 1)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center gap-1"
            title="Force scale out +1 server"
          >
            <Plus className="w-3.5 h-3.5" /> Scale Out
          </button>
          <button
            onClick={() => onManualScale('in', 1)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1"
            title="Force scale in -1 server"
          >
            <Minus className="w-3.5 h-3.5" /> Scale In
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Min Servers</label>
            <input
              type="number"
              name="minServers"
              min="1"
              max="20"
              value={formData.minServers}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Max Servers (Cap)</label>
            <input
              type="number"
              name="maxServers"
              min="1"
              max="30"
              value={formData.maxServers}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Out CPU Threshold (%)</label>
            <input
              type="number"
              name="outCpu"
              min="10"
              max="95"
              value={formData.outCpu}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Out RPS / Server</label>
            <input
              type="number"
              name="outRps"
              min="10"
              max="5000"
              value={formData.outRps}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Out p95 Latency (ms)</label>
            <input
              type="number"
              name="outLatency"
              min="50"
              max="5000"
              value={formData.outLatency}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">In CPU Idle (%)</label>
            <input
              type="number"
              name="inCpu"
              min="5"
              max="50"
              value={formData.inCpu}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Scale Out Cooldown (s)</label>
            <input
              type="number"
              name="cooldownOutSec"
              min="5"
              max="300"
              value={formData.cooldownOutSec}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <label className="text-slate-400 block mb-1 font-medium text-[11px] sm:text-xs">Scale In Cooldown (s)</label>
            <input
              type="number"
              name="cooldownInSec"
              min="10"
              max="600"
              value={formData.cooldownInSec}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 sm:py-1 text-slate-200 font-mono text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2.5 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-medium text-center sm:text-left">
              Policy updated successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Policy
          </button>
        </div>
      </form>
    </div>
  );
}

export default PolicyForm;

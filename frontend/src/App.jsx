import React from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { useSocket } from './hooks/useSocket.js';
import { StatCards } from './components/StatCards.jsx';
import { ServerGrid } from './components/ServerGrid.jsx';
import { RpsChart } from './components/RpsChart.jsx';
import { LatencyChart } from './components/LatencyChart.jsx';
import { ScalingTimeline } from './components/ScalingTimeline.jsx';
import { PolicyForm } from './components/PolicyForm.jsx';
import { LoadTestPanel } from './components/LoadTestPanel.jsx';

export function App() {
  const {
    isConnected,
    servers,
    latestMetric,
    metricsHistory,
    events,
    policy,
    mode,
    isScaling,
    updatePolicy,
    manualScale,
    togglePause,
    triggerLoadTest,
    refreshStatus,
  } = useSocket();

  const handleDrainServer = async (serverId) => {
    if (confirm(`Initiate graceful drain and removal of server ${serverId}?`)) {
      await manualScale('in', 1, serverId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Elasti<span className="text-teal-400">Node</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Servers that grow when traffic grows, and shrink when it doesn't.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className={isConnected ? 'text-slate-300' : 'text-rose-400'}>
                {isConnected ? 'Socket.IO Live' : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={refreshStatus}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        <StatCards
          latestMetric={latestMetric}
          servers={servers}
          policy={policy}
          mode={mode}
          isScaling={isScaling}
        />

        <ServerGrid servers={servers} onDrainServer={handleDrainServer} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RpsChart data={metricsHistory} />
          <LatencyChart data={metricsHistory} policy={policy} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ScalingTimeline events={events} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <LoadTestPanel onTriggerLoadTest={triggerLoadTest} />
            <PolicyForm
              policy={policy}
              mode={mode}
              onUpdatePolicy={updatePolicy}
              onTogglePause={togglePause}
              onManualScale={manualScale}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>ElastiNode &copy; 2026 &bull; Distributed Load Balancer & Autonomous Elastic Cluster</p>
      </footer>
    </div>
  );
}

export default App;

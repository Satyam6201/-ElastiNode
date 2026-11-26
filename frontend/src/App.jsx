import React, { useState } from 'react';
import {
  Layers,
  Activity,
  Server,
  Sliders,
  History,
  Flame,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { useSocket } from './hooks/useSocket.js';
import { StatCards } from './components/StatCards.jsx';
import { ServerGrid } from './components/ServerGrid.jsx';
import { RpsChart } from './components/RpsChart.jsx';
import { LatencyChart } from './components/LatencyChart.jsx';
import { ScalingTimeline } from './components/ScalingTimeline.jsx';
import { PolicyForm } from './components/PolicyForm.jsx';
import { LoadTestPanel } from './components/LoadTestPanel.jsx';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');

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
    if (window.confirm(`Initiate graceful drain and decommission for node ${serverId}?`)) {
      await manualScale('in', 1, serverId);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'fleet', label: 'Fleet Nodes', icon: Server, badge: servers?.length },
    { id: 'metrics', label: 'Telemetry', icon: Activity },
    { id: 'benchmarks', label: 'Load Generator', icon: Flame },
    { id: 'policy', label: 'Scaling Policy', icon: Sliders },
    { id: 'audit', label: 'Audit Log', icon: History, badge: events?.length },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased">
      <header className="border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-100 shrink-0">
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 min-w-0 font-mono text-xs">
                <span className="font-semibold text-zinc-100 tracking-tight text-sm">
                  ElastiNode
                </span>
                <span className="text-zinc-600 hidden sm:inline">/</span>
                <span className="text-zinc-400 hidden sm:inline truncate">
                  cluster-prod-1
                </span>
                <span className="text-zinc-600 hidden md:inline">/</span>
                <span className="text-zinc-500 hidden md:inline">port:8080</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={isConnected ? 'text-zinc-300' : 'text-rose-400'}>
                  {isConnected ? 'STREAM CONNECTED' : 'OFFLINE'}
                </span>
              </div>

              <button
                onClick={refreshStatus}
                className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 transition-colors"
                title="Refresh cluster state"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-400 text-zinc-100 font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge != null && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LoadTestPanel onTriggerLoadTest={triggerLoadTest} />
              <ScalingTimeline events={events} />
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <StatCards
              latestMetric={latestMetric}
              servers={servers}
              policy={policy}
              mode={mode}
              isScaling={isScaling}
            />
            <ServerGrid servers={servers} onDrainServer={handleDrainServer} />
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <StatCards
              latestMetric={latestMetric}
              servers={servers}
              policy={policy}
              mode={mode}
              isScaling={isScaling}
            />
            <div className="grid grid-cols-1 gap-6">
              <RpsChart data={metricsHistory} />
              <LatencyChart data={metricsHistory} policy={policy} />
            </div>
          </div>
        )}

        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <LoadTestPanel onTriggerLoadTest={triggerLoadTest} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RpsChart data={metricsHistory} />
              <LatencyChart data={metricsHistory} policy={policy} />
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="space-y-6">
            <PolicyForm
              policy={policy}
              mode={mode}
              onUpdatePolicy={updatePolicy}
              onTogglePause={togglePause}
              onManualScale={manualScale}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <ScalingTimeline events={events} />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800/80 py-4 px-4 sm:px-6 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-zinc-400">ElastiNode</span>
            <span>-</span>
            <span>Autonomous Elastic Cluster & Distributed Load Balancer</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
            <span>Cluster Port: 8080</span>
            <span>Dashboard: 5173</span>
            <span>Engine: Node.js / React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

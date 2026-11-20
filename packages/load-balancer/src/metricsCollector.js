import { EventEmitter } from 'node:events';

export class MetricsCollector extends EventEmitter {
  constructor(pool, options = {}) {
    super();
    this.pool = pool;
    this.historyLimit = options.historyLimit || 120;
    this.history = [];

    this.currentWindow = {
      latencies: [],
      errorCount: 0,
      totalCount: 0,
      perServerCounts: new Map(),
    };

    this.latestSnapshot = {
      ts: Date.now(),
      rps: 0,
      activeConnections: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      errorRate: 0,
      perServer: {},
    };

    this.timer = null;
  }

  recordRequest({ serverId, latencyMs, isError = false }) {
    this.currentWindow.totalCount++;
    if (isError) this.currentWindow.errorCount++;
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      this.currentWindow.latencies.push(latencyMs);
    }

    if (serverId) {
      let serverStats = this.currentWindow.perServerCounts.get(serverId);
      if (!serverStats) {
        serverStats = { total: 0, errors: 0, latencies: [] };
        this.currentWindow.perServerCounts.set(serverId, serverStats);
      }
      serverStats.total++;
      if (isError) serverStats.errors++;
      if (Number.isFinite(latencyMs) && latencyMs >= 0) {
        serverStats.latencies.push(latencyMs);
      }
    }
  }

  aggregateWindow() {
    const ts = Date.now();
    const { latencies, errorCount, totalCount, perServerCounts } = this.currentWindow;

    this.currentWindow = {
      latencies: [],
      errorCount: 0,
      totalCount: 0,
      perServerCounts: new Map(),
    };

    let avgLatencyMs = 0;
    let p95LatencyMs = 0;

    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      const sum = latencies.reduce((acc, val) => acc + val, 0);
      avgLatencyMs = Math.round(sum / latencies.length);

      const p95Index = Math.min(
        latencies.length - 1,
        Math.floor(latencies.length * 0.95)
      );
      p95LatencyMs = Math.round(latencies[p95Index]);
    }

    const rps = totalCount;
    const errorRate = totalCount > 0 ? Math.round((errorCount / totalCount) * 1000) / 1000 : 0;

    let totalActiveConnections = 0;
    const perServer = {};
    const servers = this.pool.list();

    for (const server of servers) {
      totalActiveConnections += server.activeConnections || 0;
      const sCounts = perServerCounts.get(server.id) || { total: 0, errors: 0, latencies: [] };

      let serverAvgLatency = 0;
      if (sCounts.latencies.length > 0) {
        const sSum = sCounts.latencies.reduce((acc, val) => acc + val, 0);
        serverAvgLatency = Math.round(sSum / sCounts.latencies.length);
      }

      perServer[server.id] = {
        rps: sCounts.total,
        active: server.activeConnections || 0,
        errors: server.errors || 0,
        totalRequests: server.totalRequests || 0,
        avgLatencyMs: serverAvgLatency || server.avgLatencyMs || 0,
        state: server.state,
      };
    }

    const snapshot = {
      ts,
      rps,
      activeConnections: totalActiveConnections,
      avgLatencyMs,
      p95LatencyMs,
      errorRate,
      perServer,
    };

    this.latestSnapshot = snapshot;
    this.history.push(snapshot);
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }

    this.emit('snapshot', snapshot);
    return snapshot;
  }

  getSnapshot() {
    return { ...this.latestSnapshot };
  }

  getHistory(count = 60) {
    return this.history.slice(-count);
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.aggregateWindow();
    }, 1000);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export default MetricsCollector;

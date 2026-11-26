export class MetricsStore {
  constructor(maxSize = 300) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  push(snapshot) {
    const entry = {
      ts: snapshot.ts || Date.now(),
      rps: Number.isFinite(snapshot.rps) ? snapshot.rps : 0,
      activeConnections: Number.isFinite(snapshot.activeConnections)
        ? snapshot.activeConnections
        : 0,
      avgLatencyMs: Number.isFinite(snapshot.avgLatencyMs) ? snapshot.avgLatencyMs : 0,
      p95LatencyMs: Number.isFinite(snapshot.p95LatencyMs) ? snapshot.p95LatencyMs : 0,
      errorRate: Number.isFinite(snapshot.errorRate) ? snapshot.errorRate : 0,
      cpuAvg: Number.isFinite(snapshot.cpuAvg) ? snapshot.cpuAvg : 0,
      perServer: snapshot.perServer || {},
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
    return entry;
  }

  last(seconds = 30) {
    const cutoff = Date.now() - seconds * 1000;
    return this.buffer.filter((entry) => entry.ts >= cutoff);
  }

  computeLoad(seconds = 30, currentServerCount = 1) {
    const window = this.last(seconds);
    const count = Math.max(1, currentServerCount);

    if (window.length === 0) {
      return {
        sampleCount: 0,
        rps: 0,
        rpsPerServer: 0,
        cpu: 0,
        avgLatency: 0,
        p95: 0,
        errorRate: 0,
        activeConnections: 0,
      };
    }

    let totalRps = 0;
    let totalCpu = 0;
    let totalAvgLatency = 0;
    let maxP95 = 0;
    let totalErrorRate = 0;
    let totalActiveConns = 0;

    for (const snap of window) {
      totalRps += snap.rps;
      totalCpu += snap.cpuAvg;
      totalAvgLatency += snap.avgLatencyMs;
      if (snap.p95LatencyMs > maxP95) {
        maxP95 = snap.p95LatencyMs;
      }
      totalErrorRate += snap.errorRate;
      totalActiveConns += snap.activeConnections;
    }

    const n = window.length;
    const avgRps = Math.round((totalRps / n) * 10) / 10;
    const rpsPerServer = Math.round((avgRps / count) * 10) / 10;
    const avgCpu = Math.round((totalCpu / n) * 10) / 10;
    const avgLatency = Math.round(totalAvgLatency / n);
    const p95 = Math.round(maxP95);
    const errorRate = Math.round((totalErrorRate / n) * 1000) / 1000;
    const activeConnections = Math.round(totalActiveConns / n);

    return {
      sampleCount: n,
      rps: avgRps,
      rpsPerServer,
      cpu: avgCpu,
      avgLatency,
      p95,
      errorRate,
      activeConnections,
    };
  }

  clear() {
    this.buffer = [];
  }
}

export default MetricsStore;

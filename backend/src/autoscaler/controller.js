import { EventEmitter } from 'node:events';
import { createLogger } from '../logger.js';
import config from '../config.js';
import { MetricsStore } from './metricsStore.js';
import { PolicyEngine } from './policy.js';
import { DatabaseService } from './db.js';
import { ProcessProvisioner } from './processProvisioner.js';

const logger = createLogger('autoscaler-controller');

export class AutoscalerController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.lbAdminUrl = (options.lbAdminUrl || `http://127.0.0.1:${config.lbAdminPort}`).replace(/\/$/, '');
    this.lbUrl = (options.lbUrl || `http://127.0.0.1:${config.lbPort}`).replace(/\/$/, '');
    this.adminToken = options.adminToken || config.adminToken;
    this.evalIntervalMs = options.evalIntervalMs || config.evalIntervalMs || 5000;
    this.drainTimeoutMs = options.drainTimeoutMs || config.drainTimeoutMs || 30000;

    this.metricsStore = options.metricsStore || new MetricsStore();
    this.policy = options.policy || new PolicyEngine({
      minServers: options.minServers || config.minServers,
      maxServers: options.maxServers || config.maxServers,
    });
    this.db = options.db || new DatabaseService(options.dbPath);
    this.provisioner = options.provisioner || new ProcessProvisioner(options);

    this.servers = new Map();
    this.isScaling = false;
    this.evalTimer = null;
    this.isStarted = false;

    const savedPolicy = this.db.getPolicy();
    if (savedPolicy) {
      this.policy.updateConfig(savedPolicy);
    }

    this.provisioner.on('server:crashed', (data) => {
      this.handleServerCrash(data).catch((err) => {
        logger.error({ err, data }, 'Failed to handle server crash event');
      });
    });
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.adminToken}`,
    };
  }

  async fetchLbMetrics() {
    try {
      const [poolRes, metricsRes] = await Promise.all([
        fetch(`${this.lbAdminUrl}/admin/pool`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(3000),
        }),
        fetch(`${this.lbAdminUrl}/admin/metrics`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(3000),
        }),
      ]);

      const poolData = poolRes.ok ? await poolRes.json() : null;
      const metricsData = metricsRes.ok ? await metricsRes.json() : null;

      return { poolData, metricsData };
    } catch (err) {
      logger.debug({ err: err.message }, 'Failed to contact LB admin API');
      return { poolData: null, metricsData: null };
    }
  }

  async fetchBackendMetrics() {
    let totalCpu = 0;
    let counted = 0;

    for (const srv of this.servers.values()) {
      if (srv.state === 'healthy') {
        try {
          const res = await fetch(`${srv.url}/metrics`, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            const data = await res.json();
            if (Number.isFinite(data.cpu)) {
              totalCpu += data.cpu;
              counted++;
              srv.cpu = data.cpu;
              srv.memoryMb = data.memoryMb;
            }
          }
        } catch (_err) {
          void _err;
        }
      }
    }

    return counted > 0 ? Math.round((totalCpu / counted) * 10) / 10 : 0;
  }

  async evaluateStep() {
    if (this.isScaling) return;

    try {
      const { poolData, metricsData } = await this.fetchLbMetrics();
      const backendCpuAvg = await this.fetchBackendMetrics();

      if (poolData && Array.isArray(poolData.servers)) {
        for (const lbSrv of poolData.servers) {
          const local = this.servers.get(lbSrv.id);
          if (local) {
            local.state = lbSrv.state;
            local.activeConnections = lbSrv.activeConnections || 0;
            local.totalRequests = lbSrv.totalRequests || 0;
          }
        }
      }

      const snapshot = {
        ts: Date.now(),
        rps: metricsData?.rps || 0,
        activeConnections: metricsData?.activeConnections || 0,
        avgLatencyMs: metricsData?.avgLatencyMs || 0,
        p95LatencyMs: metricsData?.p95LatencyMs || 0,
        errorRate: metricsData?.errorRate || 0,
        cpuAvg: backendCpuAvg,
        perServer: metricsData?.perServer || {},
      };

      this.metricsStore.push(snapshot);

      this.db.insertMetric({
        rps: snapshot.rps,
        avgLatency: snapshot.avgLatencyMs,
        p95Latency: snapshot.p95LatencyMs,
        cpuAvg: snapshot.cpuAvg,
        activeConns: snapshot.activeConnections,
        serverCount: this.servers.size,
        errorRate: snapshot.errorRate,
      });

      this.emit('metrics', snapshot);

      const currentCount = Array.from(this.servers.values()).filter(
        (s) => s.state === 'healthy' || s.state === 'starting'
      ).length;

      const load = this.metricsStore.computeLoad(30, currentCount);
      const decision = this.policy.evaluate({
        load,
        currentServerCount: currentCount,
        now: Date.now(),
      });

      if (decision.action === 'SCALE_OUT' && decision.count > 0) {
        logger.info({ decision }, 'Autoscaler triggered SCALE_OUT');
        await this.scaleOut(decision.count, decision.reason, load);
      } else if (decision.action === 'SCALE_IN' && decision.count > 0) {
        logger.info({ decision }, 'Autoscaler triggered SCALE_IN');
        await this.scaleIn(decision.count, decision.reason, load);
      }
    } catch (err) {
      logger.error({ err }, 'Error in autoscaler evaluation step');
    }
  }

  async scaleOut(count = 1, reason = 'Automated scale out', loadSnapshot = {}) {
    this.isScaling = true;
    const serversBefore = this.servers.size;

    try {
      for (let i = 0; i < count; i++) {
        if (this.servers.size >= this.policy.getConfig().maxServers) {
          logger.warn('Cannot scale out: max servers reached');
          break;
        }

        const instance = await this.provisioner.start();
        const serverRecord = {
          id: instance.id,
          url: instance.url,
          port: instance.port,
          pid: instance.pid,
          state: 'healthy',
          activeConnections: 0,
          startedAt: Date.now(),
        };
        this.servers.set(instance.id, serverRecord);

        try {
          await fetch(`${this.lbAdminUrl}/admin/servers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              id: instance.id,
              url: instance.url,
              weight: 1,
            }),
            signal: AbortSignal.timeout(5000),
          });
        } catch (regErr) {
          logger.error({ err: regErr.message, id: instance.id }, 'Failed to register server with LB');
        }

        const serversAfter = this.servers.size;
        this.db.insertEvent({
          type: 'SCALE_OUT',
          serverId: instance.id,
          reason,
          serversBefore,
          serversAfter,
          metrics: loadSnapshot,
        });

        this.emit('scaling:event', {
          type: 'SCALE_OUT',
          serverId: instance.id,
          reason,
          serversBefore,
          serversAfter,
          ts: Date.now(),
        });
        this.emit('servers', this.getServerList());
      }
    } finally {
      this.isScaling = false;
    }
  }

  async scaleIn(count = 1, reason = 'Automated scale in', loadSnapshot = {}) {
    this.isScaling = true;
    const minServers = this.policy.getEffectiveMinServers();

    try {
      for (let i = 0; i < count; i++) {
        if (this.servers.size <= minServers) {
          logger.warn({ count: this.servers.size, minServers }, 'Cannot scale in: min servers reached');
          break;
        }

        const serversBefore = this.servers.size;

        const candidates = Array.from(this.servers.values()).filter((s) => s.state !== 'draining');
        if (candidates.length === 0) break;

        candidates.sort((a, b) => (a.activeConnections || 0) - (b.activeConnections || 0));
        const victim = candidates[0];

        logger.info({ victimId: victim.id, activeConnections: victim.activeConnections }, 'Initiating graceful server drain');

        victim.state = 'draining';
        try {
          await fetch(`${this.lbAdminUrl}/admin/servers/${victim.id}/drain`, {
            method: 'POST',
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(5000),
          });
        } catch (drainErr) {
          logger.warn({ err: drainErr.message, id: victim.id }, 'Drain call to LB failed');
        }
        this.emit('servers', this.getServerList());

        const drainStartTime = Date.now();
        while (Date.now() - drainStartTime < this.drainTimeoutMs) {
          const { poolData } = await this.fetchLbMetrics();
          const liveServer = poolData?.servers?.find((s) => s.id === victim.id);
          const active = liveServer ? liveServer.activeConnections : 0;
          if (active === 0) {
            logger.info({ victimId: victim.id }, 'Server drained cleanly (0 active connections)');
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await this.provisioner.stop(victim.id);

        try {
          await fetch(`${this.lbAdminUrl}/admin/servers/${victim.id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(5000),
          });
        } catch (delErr) {
          logger.warn({ err: delErr.message, id: victim.id }, 'Remove call to LB failed');
        }

        this.servers.delete(victim.id);
        const serversAfter = this.servers.size;

        this.db.insertEvent({
          type: 'SCALE_IN',
          serverId: victim.id,
          reason,
          serversBefore,
          serversAfter,
          metrics: loadSnapshot,
        });

        this.emit('scaling:event', {
          type: 'SCALE_IN',
          serverId: victim.id,
          reason,
          serversBefore,
          serversAfter,
          ts: Date.now(),
        });
        this.emit('servers', this.getServerList());
      }
    } finally {
      this.isScaling = false;
    }
  }

  async handleServerCrash({ id, code, signal }) {
    logger.warn({ id, code, signal }, 'Crash recovery triggered for backend server');
    this.servers.delete(id);

    try {
      await fetch(`${this.lbAdminUrl}/admin/servers/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(3000),
      });
    } catch (_err) {
      void _err;
    }

    const minServers = this.policy.getEffectiveMinServers();
    const serversBefore = this.servers.size;

    this.db.insertEvent({
      type: 'SERVER_FAILED',
      serverId: id,
      reason: `Server crashed unexpectedly (code: ${code}, signal: ${signal})`,
      serversBefore: serversBefore + 1,
      serversAfter: serversBefore,
      metrics: {},
    });

    this.emit('scaling:event', {
      type: 'SERVER_FAILED',
      serverId: id,
      reason: `Server crashed unexpectedly`,
      ts: Date.now(),
    });
    this.emit('servers', this.getServerList());

    if (this.servers.size < minServers) {
      logger.info({ current: this.servers.size, minServers }, 'Recovering lost capacity; launching replacement server');
      await this.scaleOut(minServers - this.servers.size, 'Automatic crash recovery replacement');
    }
  }

  getServerList() {
    return Array.from(this.servers.values()).map((s) => ({ ...s }));
  }

  async start() {
    if (this.isStarted) return;
    this.isStarted = true;

    const minServers = this.policy.getEffectiveMinServers();
    logger.info({ minServers }, 'Initializing baseline server fleet');

    while (this.servers.size < minServers) {
      await this.scaleOut(1, 'Baseline initialization to minServers');
    }

    this.evalTimer = setInterval(() => {
      this.evaluateStep().catch((err) => {
        logger.error({ err }, 'Unhandled error in evaluation loop');
      });
    }, this.evalIntervalMs);

    if (this.evalTimer.unref) this.evalTimer.unref();
    logger.info({ evalIntervalMs: this.evalIntervalMs }, 'Autoscaler control loop started');
  }

  async stop() {
    if (this.evalTimer) {
      clearInterval(this.evalTimer);
      this.evalTimer = null;
    }
    this.isStarted = false;

    const serverIds = Array.from(this.servers.keys());
    for (const id of serverIds) {
      await this.provisioner.stop(id);
    }
    this.servers.clear();
    this.db.close();
    logger.info('Autoscaler controller stopped');
  }
}

export default AutoscalerController;

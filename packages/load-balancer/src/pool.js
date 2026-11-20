import { EventEmitter } from 'node:events';
import { createLogger } from '@elastinode/shared';

const logger = createLogger('lb-pool');

export class BackendPool extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map();
  }

  register({ id, url, weight = 1, state = 'healthy' }) {
    if (!id || !url) {
      throw new Error('Server registration requires id and url');
    }

    const entry = {
      id,
      url: url.replace(/\/$/, ''),
      state,
      weight: Math.max(1, parseInt(weight, 10) || 1),
      activeConnections: 0,
      totalRequests: 0,
      errors: 0,
      avgLatencyMs: 0,
      startedAt: Date.now(),
      consecutiveErrors: 0,
      consecutiveSuccesses: 0,
      currentWeight: 0,
    };

    this.servers.set(id, entry);
    logger.info({ id, url, state, weight: entry.weight }, 'Backend server registered in pool');
    this.emit('server:added', entry);
    return { ...entry };
  }

  get(id) {
    const s = this.servers.get(id);
    return s ? { ...s } : null;
  }

  list() {
    return Array.from(this.servers.values()).map((s) => ({ ...s }));
  }

  getHealthyServers() {
    return Array.from(this.servers.values()).filter((s) => s.state === 'healthy');
  }

  setState(id, newState, reason = '') {
    const s = this.servers.get(id);
    if (!s) return null;
    const oldState = s.state;
    if (oldState === newState) return { ...s };

    s.state = newState;
    logger.info({ id, oldState, newState, reason }, 'Server state changed');
    this.emit('server:stateChange', { id, oldState, newState, reason });
    return { ...s };
  }

  setDrain(id) {
    return this.setState(id, 'draining', 'Drain initiated');
  }

  setUnhealthy(id, reason = 'Health check failed') {
    return this.setState(id, 'unhealthy', reason);
  }

  setHealthy(id, reason = 'Health check passed') {
    const s = this.servers.get(id);
    if (s) {
      s.consecutiveErrors = 0;
    }
    return this.setState(id, 'healthy', reason);
  }

  remove(id) {
    const s = this.servers.get(id);
    if (!s) return false;
    this.servers.delete(id);
    logger.info({ id }, 'Backend server removed from pool');
    this.emit('server:removed', { id });
    return true;
  }

  recordRequestStart(id) {
    const s = this.servers.get(id);
    if (s) {
      s.activeConnections++;
      s.totalRequests++;
    }
  }

  recordRequestEnd(id, latencyMs, isError = false) {
    const s = this.servers.get(id);
    if (!s) return;

    s.activeConnections = Math.max(0, s.activeConnections - 1);

    if (latencyMs >= 0) {
      s.avgLatencyMs = s.avgLatencyMs === 0 ? latencyMs : Math.round(s.avgLatencyMs * 0.8 + latencyMs * 0.2);
    }

    if (isError) {
      s.errors++;
      s.consecutiveErrors++;
      s.consecutiveSuccesses = 0;
      if (s.consecutiveErrors >= 3 && s.state === 'healthy') {
        this.setUnhealthy(id, 'Passive check: 3 consecutive proxy errors');
      }
    } else {
      s.consecutiveErrors = 0;
      s.consecutiveSuccesses++;
    }
  }
}

export default BackendPool;

import { createLogger } from '@elastinode/shared';

const logger = createLogger('lb-health-checker');

export class HealthChecker {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.intervalMs = options.intervalMs || 5000;
    this.timeoutMs = options.timeoutMs || 2000;
    this.timer = null;
    this.isRunning = false;
  }

  async checkServer(server) {
    if (server.state === 'draining' || server.state === 'terminated') {
      return;
    }

    try {
      const response = await fetch(`${server.url}/health`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'ok') {
          server.consecutiveSuccesses = (server.consecutiveSuccesses || 0) + 1;
          server.consecutiveErrors = 0;

          if (server.state === 'unhealthy' && server.consecutiveSuccesses >= 2) {
            this.pool.setHealthy(server.id, 'Active check: 2 consecutive successful probes');
          }
          return;
        }
      }

      this.handleCheckFailure(server, `Probe returned status ${response.status}`);
    } catch (err) {
      this.handleCheckFailure(server, err.name === 'TimeoutError' ? 'Probe timed out' : err.message);
    }
  }

  handleCheckFailure(server, reason) {
    server.consecutiveErrors = (server.consecutiveErrors || 0) + 1;
    server.consecutiveSuccesses = 0;

    if (server.state === 'healthy' && server.consecutiveErrors >= 2) {
      logger.warn({ id: server.id, reason, errors: server.consecutiveErrors }, 'Marking server unhealthy');
      this.pool.setUnhealthy(server.id, `Active check failure: ${reason}`);
    }
  }

  async checkNow() {
    const servers = this.pool.list();
    await Promise.allSettled(servers.map((s) => this.checkServer(s)));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.checkNow().catch((err) => {
        logger.error({ err }, 'Error during health check run');
      });
    }, this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    logger.info({ intervalMs: this.intervalMs }, 'Health checker started');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Health checker stopped');
  }
}

export default HealthChecker;

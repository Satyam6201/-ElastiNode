import http from 'node:http';
import { randomUUID } from 'node:crypto';
import httpProxy from 'http-proxy';
import { createLogger } from '../logger.js';
import config from '../config.js';
import { BackendPool } from './pool.js';
import { createAlgorithm } from './algorithms/index.js';
import { HealthChecker } from './healthChecker.js';
import { MetricsCollector } from './metricsCollector.js';
import { createAdminApi } from './adminApi.js';

const logger = createLogger('load-balancer');

export function createLoadBalancer(options = {}) {
  const port = options.port || config.lbPort;
  const adminPort = options.adminPort || config.lbAdminPort;
  const adminToken = options.adminToken || config.adminToken;
  const initialAlgorithmName = options.algorithm || config.lbAlgorithm;

  const pool = new BackendPool();
  const metricsCollector = new MetricsCollector(pool);
  const healthChecker = new HealthChecker(pool, {
    intervalMs: options.healthIntervalMs || config.healthIntervalMs,
    timeoutMs: options.healthTimeoutMs || 2000,
  });

  let currentAlgorithmName = initialAlgorithmName;
  let algorithm = createAlgorithm(currentAlgorithmName);

  function setAlgorithm(name) {
    currentAlgorithmName = name;
    algorithm = createAlgorithm(name);
    logger.info({ algorithm: name }, 'Active algorithm swapped');
  }

  function getAlgorithm() {
    return currentAlgorithmName;
  }

  const proxy = httpProxy.createProxyServer({
    xfwd: true,
    ws: true,
    proxyTimeout: 30000,
    timeout: 30000,
  });

  proxy.on('error', (err, req, _res) => {
    void _res;
    logger.warn({ err: err.message, url: req?.url }, 'Proxy error encountered');
  });

  const rateLimitMap = new Map();
  function checkRateLimit(ip) {
    const now = Date.now();
    let bucket = rateLimitMap.get(ip);
    if (!bucket) {
      bucket = { tokens: 100, lastRefill: now };
      rateLimitMap.set(ip, bucket);
    }
    const deltaSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(100, bucket.tokens + deltaSec * 50);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return false;
    }
    bucket.tokens -= 1;
    return true;
  }

  function handleRequest(req, res) {
    const requestId = randomUUID();
    const startTime = Date.now();
    res.setHeader('X-Request-Id', requestId);

    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    if (!checkRateLimit(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded' })
      );
    }

    const healthyServers = pool.getHealthyServers();
    if (healthyServers.length === 0) {
      metricsCollector.recordRequest({ serverId: null, latencyMs: 0, isError: true });
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          error: 'Service Unavailable',
          message: 'No healthy backend servers in pool',
          requestId,
        })
      );
    }

    let selectedServer = algorithm.select(healthyServers, req);
    if (!selectedServer) {
      selectedServer = healthyServers[0];
    }

    let isRetried = false;
    const canRetry = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);

    function attemptProxy(server) {
      pool.recordRequestStart(server.id);

      let finished = false;
      const onEnd = (isError = false) => {
        if (!finished) {
          finished = true;
          const latencyMs = Date.now() - startTime;
          pool.recordRequestEnd(server.id, latencyMs, isError);
          metricsCollector.recordRequest({ serverId: server.id, latencyMs, isError });
        }
      };

      const originalWriteHead = res.writeHead;
      res.writeHead = function (...args) {
        if (!res.headersSent) {
          res.setHeader('X-Served-By', server.id);
        }
        return originalWriteHead.apply(this, args);
      };

      res.on('finish', () => onEnd(false));
      res.on('close', () => {
        if (!res.writableEnded) {
          onEnd(true);
        }
      });

      proxy.web(req, res, { target: server.url }, (_err) => {
        void _err;
        if (!res.headersSent && canRetry && !isRetried) {
          isRetried = true;
          onEnd(true);
          const alternateServers = pool.getHealthyServers().filter((s) => s.id !== server.id);
          if (alternateServers.length > 0) {
            const nextServer = algorithm.select(alternateServers, req) || alternateServers[0];
            logger.warn(
              { failedServer: server.id, nextServer: nextServer.id },
              'Retrying request on alternate server'
            );
            attemptProxy(nextServer);
            return;
          }
        }

        onEnd(true);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'Bad Gateway',
              message: 'Failed to connect to backend server',
              serverId: server.id,
              requestId,
            })
          );
        }
      });
    }

    attemptProxy(selectedServer);
  }

  const proxyServer = http.createServer(handleRequest);

  proxyServer.on('upgrade', (req, socket, head) => {
    const healthyServers = pool.getHealthyServers();
    if (healthyServers.length === 0) {
      socket.destroy();
      return;
    }
    const selectedServer = algorithm.select(healthyServers, req) || healthyServers[0];
    proxy.ws(req, socket, head, { target: selectedServer.url }, (err) => {
      logger.warn({ err: err.message }, 'WebSocket proxy error');
      socket.destroy();
    });
  });

  const adminApp = createAdminApi({
    pool,
    metricsCollector,
    setAlgorithm,
    getAlgorithm,
    adminToken,
  });
  const adminServer = http.createServer(adminApp);

  async function start() {
    metricsCollector.start();
    healthChecker.start();

    await Promise.all([
      new Promise((resolve, reject) => {
        proxyServer.listen(port, () => {
          logger.info({ port }, 'Load Balancer public proxy listening');
          resolve();
        });
        proxyServer.on('error', reject);
      }),
      new Promise((resolve, reject) => {
        adminServer.listen(adminPort, '127.0.0.1', () => {
          logger.info({ port: adminPort }, 'Load Balancer admin API listening');
          resolve();
        });
        adminServer.on('error', reject);
      }),
    ]);

    return { proxyServer, adminServer, pool, metricsCollector, healthChecker };
  }

  async function stop() {
    metricsCollector.stop();
    healthChecker.stop();
    proxy.close();

    await Promise.all([
      new Promise((resolve) => proxyServer.close(resolve)),
      new Promise((resolve) => adminServer.close(resolve)),
    ]);
    logger.info('Load Balancer stopped');
  }

  return {
    proxyServer,
    adminServer,
    adminApp,
    pool,
    metricsCollector,
    healthChecker,
    start,
    stop,
    handleRequest,
    setAlgorithm,
    getAlgorithm,
  };
}

const isMainModule = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule || process.env.RUN_STANDALONE === 'true') {
  const lb = createLoadBalancer();
  lb.start().catch((err) => {
    logger.error({ err }, 'Failed to start Load Balancer');
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    await lb.stop();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await lb.stop();
    process.exit(0);
  });
}

export default createLoadBalancer;

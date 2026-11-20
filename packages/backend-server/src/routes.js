import { Router } from 'express';
import pidusage from 'pidusage';

export function createRoutes({ serverId, getInFlightRequests, getEventLoopLag }) {
  const router = Router();

  let lastCpuUsage = process.cpuUsage();
  let lastCpuTime = Date.now();

  function getFallbackCpu() {
    const currentUsage = process.cpuUsage(lastCpuUsage);
    const currentTime = Date.now();
    const timeDeltaMs = currentTime - lastCpuTime || 1;
    const userMs = currentUsage.user / 1000;
    const systemMs = currentUsage.system / 1000;
    const totalMs = userMs + systemMs;
    const cpuPercent = Math.min(100, Math.round((totalMs / timeDeltaMs) * 100 * 10) / 10);

    lastCpuUsage = process.cpuUsage();
    lastCpuTime = currentTime;
    return Number.isFinite(cpuPercent) ? cpuPercent : 0;
  }

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      id: serverId,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  router.get('/', (req, res) => {
    res.json({
      message: 'ElastiNode backend server responding',
      id: serverId,
      timestamp: Date.now(),
    });
  });

  router.get('/work', async (req, res) => {
    const rawMs = parseInt(req.query.ms, 10);
    const ms = Number.isFinite(rawMs) && rawMs >= 0 ? Math.min(rawMs, 30000) : 200;

    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, ms));
    const durationMs = Date.now() - start;

    res.json({
      message: 'work complete',
      requestedMs: ms,
      durationMs,
      id: serverId,
    });
  });

  router.get('/cpu', (req, res) => {
    const rawN = parseInt(req.query.n, 10);
    const n = Number.isFinite(rawN) && rawN >= 1 ? Math.min(rawN, 40) : 35;

    const start = Date.now();

    function fib(num) {
      if (num <= 1) return num;
      return fib(num - 1) + fib(num - 2);
    }

    const result = fib(n);
    const durationMs = Date.now() - start;

    res.json({
      message: 'cpu work complete',
      n,
      result,
      durationMs,
      id: serverId,
    });
  });

  router.get('/metrics', async (req, res) => {
    let cpu = 0;
    let memory = process.memoryUsage().rss;

    try {
      const stats = await pidusage(process.pid);
      if (stats && Number.isFinite(stats.cpu)) {
        cpu = Math.round(stats.cpu * 10) / 10;
        memory = stats.memory || memory;
      } else {
        cpu = getFallbackCpu();
      }
    } catch {
      cpu = getFallbackCpu();
    }

    const inFlightRequests = getInFlightRequests ? getInFlightRequests() : 0;
    const eventLoopLagMs = getEventLoopLag ? getEventLoopLag() : 0;

    res.json({
      id: serverId,
      pid: process.pid,
      cpu,
      memory,
      memoryMb: Math.round((memory / (1024 * 1024)) * 10) / 10,
      eventLoopLagMs: Math.round(eventLoopLagMs * 100) / 100,
      inFlightRequests,
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });

  return router;
}

export default createRoutes;

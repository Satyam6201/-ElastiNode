import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createLogger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDist = path.resolve(__dirname, '../../../frontend/dist');

const logger = createLogger('autoscaler-api');

const PolicyUpdateSchema = z.object({
  minServers: z.number().int().min(1).optional(),
  maxServers: z.number().int().min(1).optional(),
  outCpu: z.number().min(1).max(100).optional(),
  outRps: z.number().min(1).optional(),
  outLatency: z.number().min(1).optional(),
  inCpu: z.number().min(1).max(100).optional(),
  inRps: z.number().min(1).optional(),
  cooldownOutMs: z.number().min(1000).optional(),
  cooldownInMs: z.number().min(1000).optional(),
  isPaused: z.boolean().optional(),
});

const ScaleActionSchema = z.object({
  action: z.enum(['out', 'in']),
  count: z.number().int().min(1).default(1).optional(),
  serverId: z.string().optional(),
});

const LoadTestSchema = z.object({
  rps: z.number().int().min(1).default(200).optional(),
  duration: z.number().int().min(1).default(30).optional(),
  scenario: z.enum(['standard', 'spike', 'ramp-up']).default('standard').optional(),
});

export function createAutoscalerApi({
  controller,
  db,
  socketBroadcaster,
  adminToken,
  onRunLoadTest,
}) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  function requireAuth(req, res, next) {
    if (!adminToken || adminToken === 'change-me') {
      return next();
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;
    if (token !== adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    next();
  }

  app.get('/api/status', (req, res) => {
    const policyConfig = controller.policy.getConfig();
    const servers = controller.getServerList();

    res.json({
      status: 'ok',
      mode: policyConfig.isPaused ? 'paused' : 'auto',
      currentCount: servers.length,
      desiredCount: controller.policy.getEffectiveMinServers(),
      minServers: policyConfig.minServers,
      maxServers: policyConfig.maxServers,
      isScaling: controller.isScaling,
      servers,
      policy: policyConfig,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  app.get('/api/events', (req, res) => {
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

    const events = db.getEvents(limit);
    res.json({
      total: events.length,
      events,
    });
  });

  app.get('/api/metrics', (req, res) => {
    const rangeParam = req.query.range || '15m';
    let rangeMs = 15 * 60 * 1000;

    if (typeof rangeParam === 'string') {
      const match = rangeParam.match(/^(\d+)([smhd])$/);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2];
        if (unit === 's') rangeMs = val * 1000;
        else if (unit === 'm') rangeMs = val * 60 * 1000;
        else if (unit === 'h') rangeMs = val * 3600 * 1000;
        else if (unit === 'd') rangeMs = val * 86400 * 1000;
      }
    }

    const metrics = db.getMetrics(rangeMs);
    res.json({
      range: rangeParam,
      count: metrics.length,
      metrics,
    });
  });

  app.put('/api/policy', requireAuth, (req, res) => {
    const parse = PolicyUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }

    const updated = controller.policy.updateConfig(parse.data);
    db.savePolicy(updated);

    if (socketBroadcaster?.broadcastPolicyUpdated) {
      socketBroadcaster.broadcastPolicyUpdated(updated);
    }

    logger.info({ updated }, 'Autoscaler policy updated live');
    res.json({
      message: 'Policy updated successfully',
      policy: updated,
    });
  });

  app.post('/api/scale', requireAuth, async (req, res) => {
    const parse = ScaleActionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }

    const { action, count = 1, serverId } = parse.data;

    try {
      if (action === 'out') {
        await controller.scaleOut(count, 'Manual scale out triggered via API');
        res.json({ message: `Scaled out +${count} server(s)` });
      } else if (action === 'in') {
        if (serverId) {
          const victim = controller.servers.get(serverId);
          if (!victim) {
            return res.status(404).json({ error: `Server ${serverId} not found` });
          }
          await controller.scaleIn(1, `Manual termination of server ${serverId}`);
        } else {
          await controller.scaleIn(count, 'Manual scale in triggered via API');
        }
        res.json({ message: `Scaled in -${count} server(s)` });
      }
    } catch (err) {
      res.status(500).json({ error: 'Scale operation failed', message: err.message });
    }
  });

  app.post('/api/autoscaling/pause', requireAuth, (req, res) => {
    const updated = controller.policy.updateConfig({ isPaused: true });
    db.savePolicy(updated);

    if (socketBroadcaster?.broadcastPolicyUpdated) {
      socketBroadcaster.broadcastPolicyUpdated(updated);
    }

    res.json({ message: 'Autoscaling paused', isPaused: true });
  });

  app.post('/api/autoscaling/resume', requireAuth, (req, res) => {
    const updated = controller.policy.updateConfig({ isPaused: false });
    db.savePolicy(updated);

    if (socketBroadcaster?.broadcastPolicyUpdated) {
      socketBroadcaster.broadcastPolicyUpdated(updated);
    }

    res.json({ message: 'Autoscaling resumed', isPaused: false });
  });

  app.post('/api/loadtest', requireAuth, async (req, res) => {
    const parse = LoadTestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }

    const { rps, duration, scenario } = parse.data;

    if (onRunLoadTest) {
      onRunLoadTest({ rps, duration, scenario }).catch((err) => {
        logger.error({ err }, 'Error running background load test');
      });
      return res.json({
        message: 'Load test initiated',
        config: { rps, duration, scenario },
      });
    }

    res.status(202).json({
      message: 'Load test queued',
      config: { rps, duration, scenario },
    });
  });

  if (fs.existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(dashboardDist, 'index.html'));
    });
  }

  return app;
}

export default createAutoscalerApi;

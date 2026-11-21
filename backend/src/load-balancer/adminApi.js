import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { createLogger } from '../logger.js';

const logger = createLogger('lb-admin-api');

const ServerRegisterSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  weight: z.number().int().min(1).default(1).optional(),
});

const AlgorithmSchema = z.object({
  algorithm: z.enum(['round-robin', 'least-connections', 'weighted-round-robin', 'ip-hash']),
});

export function createAdminApi({ pool, metricsCollector, setAlgorithm, getAlgorithm, adminToken }) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

    if (adminToken && adminToken !== 'change-me' && token !== adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin token' });
    }
    next();
  });

  app.get('/admin/pool', (req, res) => {
    const servers = pool.list();
    res.json({
      algorithm: getAlgorithm ? getAlgorithm() : 'round-robin',
      totalServers: servers.length,
      healthyServers: servers.filter((s) => s.state === 'healthy').length,
      servers,
    });
  });

  app.post('/admin/servers', (req, res) => {
    const parseResult = ServerRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const server = pool.register(parseResult.data);
      res.status(201).json({
        message: 'Server registered successfully',
        server,
      });
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  });

  app.post('/admin/servers/:id/drain', (req, res) => {
    const { id } = req.params;
    const server = pool.get(id);
    if (!server) {
      return res.status(404).json({ error: `Server ${id} not found` });
    }

    const updated = pool.setDrain(id);
    res.json({
      message: `Server ${id} is now draining`,
      server: updated,
    });
  });

  app.delete('/admin/servers/:id', (req, res) => {
    const { id } = req.params;
    const exists = pool.get(id);
    if (!exists) {
      return res.status(404).json({ error: `Server ${id} not found` });
    }

    pool.remove(id);
    res.json({
      message: `Server ${id} removed from pool`,
    });
  });

  app.put('/admin/algorithm', (req, res) => {
    const parseResult = AlgorithmSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    if (setAlgorithm) {
      setAlgorithm(parseResult.data.algorithm);
    }

    logger.info({ algorithm: parseResult.data.algorithm }, 'Balancing algorithm changed');
    res.json({
      message: 'Balancing algorithm updated',
      algorithm: parseResult.data.algorithm,
    });
  });

  app.get('/admin/metrics', (req, res) => {
    const metrics = metricsCollector.getSnapshot();
    res.json(metrics);
  });

  return app;
}

export default createAdminApi;

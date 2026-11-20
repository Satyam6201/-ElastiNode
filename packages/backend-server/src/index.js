import http from 'node:http';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger, config } from '@elastinode/shared';
import { createRoutes } from './routes.js';

const serverId = process.env.SERVER_ID || `srv-${process.pid}`;
const port = parseInt(process.env.PORT || '4001', 10);
const logger = createLogger(`backend-${serverId}`);

export function createServer(options = {}) {
  const currentServerId = options.serverId || serverId;
  const currentPort = options.port || port;

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  let inFlightRequests = 0;
  let isShuttingDown = false;

  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  const getInFlightRequests = () => inFlightRequests;
  const getEventLoopLag = () => histogram.mean / 1e6;

  app.use((req, res, next) => {
    if (isShuttingDown) {
      res.setHeader('Connection', 'close');
      return res.status(503).json({
        error: 'Server is shutting down',
        id: currentServerId,
      });
    }

    inFlightRequests++;
    let decremented = false;

    const decrement = () => {
      if (!decremented) {
        decremented = true;
        inFlightRequests = Math.max(0, inFlightRequests - 1);
      }
    };

    res.on('finish', decrement);
    res.on('close', decrement);

    next();
  });

  app.use(
    createRoutes({
      serverId: currentServerId,
      getInFlightRequests,
      getEventLoopLag,
    })
  );

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.originalUrl,
      id: currentServerId,
    });
  });

  app.use((err, req, res, _next) => {
    logger.error({ err }, 'Unhandled request error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      id: currentServerId,
    });
  });

  const server = http.createServer(app);

  async function shutdown(reason = 'SIGTERM') {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ reason, inFlightRequests }, 'Graceful shutdown initiated');

    server.close(() => {
      logger.info('HTTP listener closed');
    });

    const drainTimeout = config.drainTimeoutMs || 30000;
    const startTime = Date.now();

    while (inFlightRequests > 0) {
      if (Date.now() - startTime > drainTimeout) {
        logger.warn({ inFlightRequests }, 'Drain timeout exceeded; force terminating');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    histogram.disable();
    logger.info('Graceful shutdown completed successfully');
  }

  return {
    app,
    server,
    shutdown,
    getInFlightRequests,
    getEventLoopLag,
    start: () =>
      new Promise((resolve, reject) => {
        server.listen(currentPort, () => {
          logger.info({ port: currentPort, serverId: currentServerId }, 'Backend server started');
          resolve({ port: currentPort, serverId: currentServerId, server });
        });
        server.on('error', reject);
      }),
  };
}

const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule || process.env.RUN_STANDALONE === 'true') {
  const instance = createServer({ port, serverId });
  instance.start().catch((err) => {
    logger.error({ err }, 'Failed to start backend server');
    process.exit(1);
  });

  const handleTermination = async (signal) => {
    await instance.shutdown(signal);
    process.exit(0);
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));

  process.on('message', (msg) => {
    if (msg === 'shutdown' || msg?.type === 'shutdown') {
      handleTermination('IPC_SHUTDOWN');
    }
  });
}

export default createServer;

import http from 'node:http';
import { createLogger, config } from '@elastinode/shared';
import { AutoscalerController } from './controller.js';
import { createAutoscalerApi } from './api.js';
import { createSocketServer } from './socket.js';

const logger = createLogger('autoscaler-service');

export function createAutoscalerService(options = {}) {
  const port = options.port || config.autoscalerPort || 9000;
  const adminToken = options.adminToken || config.adminToken;

  const controller = new AutoscalerController(options);
  const httpServer = http.createServer();

  let socketBroadcaster = null;

  async function handleLoadTest({ rps, duration, scenario }) {
    logger.info({ rps, duration, scenario }, 'Executing load test scenario');
    try {
      const { runLoadTest } = await import('../../load-tester/src/run.js');
      await runLoadTest({
        targetUrl: `http://127.0.0.1:${config.lbPort || 8080}`,
        connections: Math.min(100, Math.ceil(rps / 5)),
        pipelining: 1,
        duration,
        scenario,
      });
    } catch (err) {
      logger.error({ err }, 'Load test execution failed');
    }
  }

  const app = createAutoscalerApi({
    controller,
    db: controller.db,
    socketBroadcaster: {
      broadcastPolicyUpdated: (p) => socketBroadcaster?.broadcastPolicyUpdated(p),
    },
    adminToken,
    onRunLoadTest: handleLoadTest,
  });

  httpServer.on('request', app);
  socketBroadcaster = createSocketServer(httpServer, controller);

  async function start() {
    await new Promise((resolve, reject) => {
      httpServer.listen(port, () => {
        logger.info({ port }, 'Autoscaler HTTP & Socket.IO service running');
        resolve();
      });
      httpServer.on('error', reject);
    });

    await controller.start();
    return { httpServer, controller, socketBroadcaster, app };
  }

  async function stop() {
    await controller.stop();
    await new Promise((resolve) => httpServer.close(resolve));
    logger.info('Autoscaler service stopped');
  }

  return { httpServer, controller, socketBroadcaster, app, start, stop };
}

const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule || process.env.RUN_STANDALONE === 'true') {
  const service = createAutoscalerService();
  service.start().catch((err) => {
    logger.error({ err }, 'Failed to start Autoscaler service');
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    await service.stop();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await service.stop();
    process.exit(0);
  });
}

export default createAutoscalerService;

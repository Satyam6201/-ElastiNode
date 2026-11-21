import { createLogger } from './logger.js';
import config from './config.js';
import { createLoadBalancer } from './load-balancer/index.js';
import { createAutoscalerService } from './autoscaler/index.js';

const logger = createLogger('backend-orchestrator');

export async function startBackend() {
  logger.info('Starting ElastiNode backend services');

  const lb = createLoadBalancer({
    port: config.lbPort,
    adminPort: config.lbAdminPort,
    adminToken: config.adminToken,
    algorithm: config.lbAlgorithm,
  });
  await lb.start();

  const autoscaler = createAutoscalerService({
    port: config.autoscalerPort,
    adminToken: config.adminToken,
    minServers: config.minServers,
    maxServers: config.maxServers,
    evalIntervalMs: config.evalIntervalMs,
    lbUrl: `http://127.0.0.1:${config.lbPort}`,
    lbAdminUrl: `http://127.0.0.1:${config.lbAdminPort}`,
  });
  await autoscaler.start();

  logger.info(`Load Balancer Proxy: http://localhost:${config.lbPort}`);
  logger.info(`Load Balancer Admin: http://localhost:${config.lbAdminPort}`);
  logger.info(`Autoscaler & API: http://localhost:${config.autoscalerPort}`);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Stopping backend services');
    await autoscaler.stop();
    await lb.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { lb, autoscaler };
}

const isMainModule = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule) {
  startBackend().catch((err) => {
    logger.error({ err }, 'Failed to start backend');
    process.exit(1);
  });
}

export default startBackend;

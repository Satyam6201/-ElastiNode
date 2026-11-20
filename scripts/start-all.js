import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLogger, config } from '@elastinode/shared';
import { createLoadBalancer } from '../packages/load-balancer/src/index.js';
import { createAutoscalerService } from '../packages/autoscaler/src/index.js';

const logger = createLogger('orchestrator');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  logger.info('Starting ElastiNode full-stack cluster');

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

  const viteCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const viteChild = spawn(viteCmd, ['vite', '--port', '3000'], {
    cwd: path.resolve(rootDir, 'packages/dashboard'),
    stdio: 'inherit',
    env: { ...process.env },
  });

  logger.info(`Load Balancer: http://localhost:${config.lbPort}`);
  logger.info(`Autoscaler & API: http://localhost:${config.autoscalerPort}`);
  logger.info(`React Dashboard: http://localhost:3000`);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Stopping cluster');
    try {
      viteChild.kill('SIGTERM');
    } catch (_err) {
      void _err;
    }
    await autoscaler.stop();
    await lb.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start orchestrator');
  process.exit(1);
});

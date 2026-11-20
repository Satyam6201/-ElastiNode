import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: envPath });

export const config = {
  lbPort: parseInt(process.env.LB_PORT || '8080', 10),
  lbAdminPort: parseInt(process.env.LB_ADMIN_PORT || '8081', 10),
  lbAlgorithm: process.env.LB_ALGORITHM || 'round-robin',
  autoscalerPort: parseInt(process.env.AUTOSCALER_PORT || '9000', 10),
  provisioner: process.env.PROVISIONER || 'process',
  backendBasePort: parseInt(process.env.BACKEND_BASE_PORT || '4001', 10),
  minServers: parseInt(process.env.MIN_SERVERS || '2', 10),
  maxServers: parseInt(process.env.MAX_SERVERS || '10', 10),
  evalIntervalMs: parseInt(process.env.EVAL_INTERVAL_MS || '5000', 10),
  healthIntervalMs: parseInt(process.env.HEALTH_INTERVAL_MS || '5000', 10),
  drainTimeoutMs: parseInt(process.env.DRAIN_TIMEOUT_MS || '30000', 10),
  adminToken: process.env.ADMIN_TOKEN || 'change-me',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
};

export default config;

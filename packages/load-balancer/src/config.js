import { config as sharedConfig } from '@elastinode/shared';

export const config = {
  port: sharedConfig.lbPort || 8080,
  adminPort: sharedConfig.lbAdminPort || 8081,
  defaultAlgorithm: sharedConfig.lbAlgorithm || 'round-robin',
  healthIntervalMs: sharedConfig.healthIntervalMs || 5000,
  healthTimeoutMs: 2000,
  adminToken: sharedConfig.adminToken || 'change-me',
  drainTimeoutMs: sharedConfig.drainTimeoutMs || 30000,
  isDev: sharedConfig.isDev,
};

export default config;

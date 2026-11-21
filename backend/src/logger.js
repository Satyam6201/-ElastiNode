import pino from 'pino';
import { config } from './config.js';

const isPretty = config.isDev && process.env.PINO_PRETTY !== 'false';

export function createLogger(name, options = {}) {
  return pino({
    name: name || 'elastinode',
    level: process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info'),
    transport: isPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    ...options,
  });
}

export const logger = createLogger('elastinode');
export default logger;

import { EventEmitter } from 'node:events';

export class BaseProvisioner extends EventEmitter {
  constructor(name = 'base') {
    super();
    this.name = name;
  }

  async start(_options = {}) {
    void _options;
    throw new Error('Provisioner.start() must be implemented by subclass');
  }

  async stop(_id) {
    void _id;
    throw new Error('Provisioner.stop() must be implemented by subclass');
  }

  async list() {
    throw new Error('Provisioner.list() must be implemented by subclass');
  }

  async waitForHealth(url, timeoutMs = 30000) {
    const startTime = Date.now();
    const probeUrl = `${url.replace(/\/$/, '')}/health`;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await fetch(probeUrl, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (body && body.status === 'ok') {
            return true;
          }
        }
      } catch (_err) {
        void _err;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`Health check timed out after ${timeoutMs}ms for ${probeUrl}`);
  }
}

export default BaseProvisioner;

import { createLogger } from '@elastinode/shared';
import { BaseProvisioner } from './baseProvisioner.js';

const logger = createLogger('docker-provisioner');

export class DockerProvisioner extends BaseProvisioner {
  constructor(options = {}) {
    super('docker');
    this.imageName = options.imageName || 'elastinode-backend:latest';
    this.basePort = options.basePort || 5001;
    this.containers = new Map();
    this.docker = null;
    this.isAvailable = false;
    this.initPromise = this.initDocker();
  }

  async initDocker() {
    try {
      const DockerModule = await import('dockerode').catch(() => null);
      if (DockerModule && DockerModule.default) {
        this.docker = new DockerModule.default();
        await this.docker.ping();
        this.isAvailable = true;
        logger.info('Connected to Docker daemon successfully');
      }
    } catch (err) {
      this.isAvailable = false;
      logger.warn({ err: err.message }, 'Docker daemon not reachable; falling back to simulated Docker mode');
    }
  }

  async start(options = {}) {
    await this.initPromise;
    const port = options.port || this.basePort + this.containers.size;
    const id = options.id || `docker-srv-${Date.now().toString(36)}`;
    const url = `http://127.0.0.1:${port}`;

    if (!this.isAvailable) {
      logger.info({ id, url, mode: 'simulated' }, 'Starting simulated Docker container');
      const simulatedRecord = {
        id,
        containerId: `sim-cid-${id}`,
        port,
        url,
        state: 'healthy',
        startedAt: Date.now(),
      };
      this.containers.set(id, simulatedRecord);
      return simulatedRecord;
    }

    try {
      const container = await this.docker.createContainer({
        Image: this.imageName,
        name: `elastinode-${id}`,
        Env: [`PORT=4000`, `SERVER_ID=${id}`],
        ExposedPorts: { '4000/tcp': {} },
        HostConfig: {
          PortBindings: { '4000/tcp': [{ HostPort: String(port) }] },
        },
      });

      await container.start();
      const record = {
        id,
        containerId: container.id,
        port,
        url,
        state: 'starting',
        startedAt: Date.now(),
      };
      this.containers.set(id, record);

      await this.waitForHealth(url, options.healthTimeoutMs || 30000);
      record.state = 'healthy';
      return record;
    } catch (err) {
      logger.error({ id, err: err.message }, 'Failed to start Docker container');
      throw err;
    }
  }

  async stop(id) {
    await this.initPromise;
    const record = this.containers.get(id);
    if (!record) return false;

    if (!this.isAvailable) {
      this.containers.delete(id);
      logger.info({ id, mode: 'simulated' }, 'Simulated Docker container stopped');
      return true;
    }

    try {
      const container = this.docker.getContainer(record.containerId);
      await container.stop({ t: 15 });
      await container.remove();
      this.containers.delete(id);
      logger.info({ id }, 'Docker container stopped and removed');
      return true;
    } catch (err) {
      logger.error({ id, err: err.message }, 'Error stopping Docker container');
      this.containers.delete(id);
      return false;
    }
  }

  async list() {
    return Array.from(this.containers.values());
  }
}

export default DockerProvisioner;

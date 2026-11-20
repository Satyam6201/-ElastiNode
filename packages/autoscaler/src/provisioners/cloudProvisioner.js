import { createLogger } from '@elastinode/shared';
import { BaseProvisioner } from './baseProvisioner.js';

const logger = createLogger('cloud-provisioner');

export class CloudProvisioner extends BaseProvisioner {
  constructor(options = {}) {
    super('cloud');
    this.provider = options.provider || 'aws';
    this.asgName = options.asgName || 'elastinode-asg';
    this.k8sNamespace = options.k8sNamespace || 'default';
    this.k8sDeployment = options.k8sDeployment || 'elastinode-backend';
    this.instances = new Map();
    this.counter = 1;
  }

  async start(options = {}) {
    const id = options.id || `cloud-${this.provider}-${this.counter++}`;
    const port = options.port || 6000 + this.instances.size;
    const url = `http://cloud-node-${id}.internal:${port}`;

    logger.info(
      { id, url, provider: this.provider },
      `Provisioning new node via ${this.provider.toUpperCase()} provider`
    );

    const record = {
      id,
      url,
      provider: this.provider,
      state: 'healthy',
      startedAt: Date.now(),
    };

    this.instances.set(id, record);
    return record;
  }

  async stop(id) {
    const record = this.instances.get(id);
    if (!record) return false;

    logger.info(
      { id, provider: this.provider },
      `Terminating node via ${this.provider.toUpperCase()} provider`
    );

    this.instances.delete(id);
    return true;
  }

  async list() {
    return Array.from(this.instances.values());
  }
}

export default CloudProvisioner;

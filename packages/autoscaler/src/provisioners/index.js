import { ProcessProvisioner } from './processProvisioner.js';
import { DockerProvisioner } from './dockerProvisioner.js';
import { CloudProvisioner } from './cloudProvisioner.js';

export function createProvisioner(type = 'process', options = {}) {
  switch (type.toLowerCase()) {
    case 'docker':
      return new DockerProvisioner(options);
    case 'cloud':
      return new CloudProvisioner(options);
    case 'process':
    default:
      return new ProcessProvisioner(options);
  }
}

export { BaseProvisioner } from './baseProvisioner.js';
export { ProcessProvisioner } from './processProvisioner.js';
export { DockerProvisioner } from './dockerProvisioner.js';
export { CloudProvisioner } from './cloudProvisioner.js';

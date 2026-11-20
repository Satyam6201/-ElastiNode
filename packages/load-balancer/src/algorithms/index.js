import { RoundRobinAlgorithm } from './roundRobin.js';
import { LeastConnectionsAlgorithm } from './leastConnections.js';
import { WeightedRoundRobinAlgorithm } from './weightedRoundRobin.js';
import { IpHashAlgorithm } from './ipHash.js';

export function createAlgorithm(name = 'round-robin') {
  switch (name) {
    case 'least-connections':
      return new LeastConnectionsAlgorithm();
    case 'weighted-round-robin':
      return new WeightedRoundRobinAlgorithm();
    case 'ip-hash':
      return new IpHashAlgorithm();
    case 'round-robin':
    default:
      return new RoundRobinAlgorithm();
  }
}

export {
  RoundRobinAlgorithm,
  LeastConnectionsAlgorithm,
  WeightedRoundRobinAlgorithm,
  IpHashAlgorithm,
};

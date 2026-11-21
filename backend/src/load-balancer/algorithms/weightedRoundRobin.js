export class WeightedRoundRobinAlgorithm {
  constructor() {
    this.name = 'weighted-round-robin';
    this.currentWeights = new Map();
  }

  select(healthyServers) {
    if (!healthyServers || healthyServers.length === 0) {
      return null;
    }

    if (healthyServers.length === 1) {
      return healthyServers[0];
    }

    let totalWeight = 0;
    let maxWeight = -Infinity;
    let selectedServer = null;

    for (const server of healthyServers) {
      const weight = Math.max(1, server.weight || 1);
      totalWeight += weight;

      const current = (this.currentWeights.get(server.id) || 0) + weight;
      this.currentWeights.set(server.id, current);

      if (current > maxWeight) {
        maxWeight = current;
        selectedServer = server;
      }
    }

    if (selectedServer) {
      const prev = this.currentWeights.get(selectedServer.id) || 0;
      this.currentWeights.set(selectedServer.id, prev - totalWeight);
    }

    return selectedServer || healthyServers[0];
  }

  reset() {
    this.currentWeights.clear();
  }
}

export default WeightedRoundRobinAlgorithm;

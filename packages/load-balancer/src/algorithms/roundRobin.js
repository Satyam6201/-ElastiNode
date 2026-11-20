export class RoundRobinAlgorithm {
  constructor() {
    this.name = 'round-robin';
    this.currentIndex = 0;
  }

  select(healthyServers) {
    if (!healthyServers || healthyServers.length === 0) {
      return null;
    }

    const index = this.currentIndex % healthyServers.length;
    this.currentIndex = (this.currentIndex + 1) % healthyServers.length;
    return healthyServers[index];
  }

  reset() {
    this.currentIndex = 0;
  }
}

export default RoundRobinAlgorithm;

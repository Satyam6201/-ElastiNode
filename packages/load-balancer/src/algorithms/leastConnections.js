export class LeastConnectionsAlgorithm {
  constructor() {
    this.name = 'least-connections';
  }

  select(healthyServers) {
    if (!healthyServers || healthyServers.length === 0) {
      return null;
    }

    let minServer = healthyServers[0];

    for (let i = 1; i < healthyServers.length; i++) {
      const server = healthyServers[i];
      if (server.activeConnections < minServer.activeConnections) {
        minServer = server;
      } else if (
        server.activeConnections === minServer.activeConnections &&
        server.totalRequests < minServer.totalRequests
      ) {
        minServer = server;
      }
    }

    return minServer;
  }

  reset() {}
}

export default LeastConnectionsAlgorithm;

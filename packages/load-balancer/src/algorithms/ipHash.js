export class IpHashAlgorithm {
  constructor() {
    this.name = 'ip-hash';
  }

  hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash >>> 0);
  }

  select(healthyServers, req) {
    if (!healthyServers || healthyServers.length === 0) {
      return null;
    }

    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';

    const index = this.hash(ip) % healthyServers.length;
    return healthyServers[index];
  }

  reset() {}
}

export default IpHashAlgorithm;

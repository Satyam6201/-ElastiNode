import { describe, it, expect } from 'vitest';
import {
  RoundRobinAlgorithm,
  LeastConnectionsAlgorithm,
  WeightedRoundRobinAlgorithm,
  IpHashAlgorithm,
  createAlgorithm,
} from '../src/load-balancer/algorithms/index.js';

describe('Load Balancer Algorithms', () => {
  const mockServers = [
    { id: 'srv-1', url: 'http://127.0.0.1:4001', activeConnections: 0, weight: 1, totalRequests: 0 },
    { id: 'srv-2', url: 'http://127.0.0.1:4002', activeConnections: 0, weight: 2, totalRequests: 0 },
    { id: 'srv-3', url: 'http://127.0.0.1:4003', activeConnections: 0, weight: 1, totalRequests: 0 },
  ];

  describe('Round Robin', () => {
    it('fairly distributes sequential requests in round-robin sequence', () => {
      const rr = new RoundRobinAlgorithm();
      const s1 = rr.select(mockServers);
      const s2 = rr.select(mockServers);
      const s3 = rr.select(mockServers);
      const s4 = rr.select(mockServers);

      expect(s1.id).toBe('srv-1');
      expect(s2.id).toBe('srv-2');
      expect(s3.id).toBe('srv-3');
      expect(s4.id).toBe('srv-1');
    });

    it('returns null on empty server list', () => {
      const rr = new RoundRobinAlgorithm();
      expect(rr.select([])).toBeNull();
    });
  });

  describe('Least Connections', () => {
    it('always selects the server with the fewest active connections', () => {
      const lc = new LeastConnectionsAlgorithm();
      const servers = [
        { id: 'srv-1', activeConnections: 5, totalRequests: 10 },
        { id: 'srv-2', activeConnections: 1, totalRequests: 10 },
        { id: 'srv-3', activeConnections: 8, totalRequests: 10 },
      ];

      const chosen = lc.select(servers);
      expect(chosen.id).toBe('srv-2');
    });

    it('breaks ties using lowest totalRequests', () => {
      const lc = new LeastConnectionsAlgorithm();
      const servers = [
        { id: 'srv-1', activeConnections: 2, totalRequests: 100 },
        { id: 'srv-2', activeConnections: 2, totalRequests: 50 },
      ];

      const chosen = lc.select(servers);
      expect(chosen.id).toBe('srv-2');
    });
  });

  describe('Weighted Round Robin', () => {
    it('smoothly spreads traffic according to server weight ratio', () => {
      const wrr = new WeightedRoundRobinAlgorithm();
      const servers = [
        { id: 'srv-A', weight: 3 },
        { id: 'srv-B', weight: 1 },
      ];

      const selections = [];
      for (let i = 0; i < 4; i++) {
        selections.push(wrr.select(servers).id);
      }

      const countA = selections.filter((id) => id === 'srv-A').length;
      const countB = selections.filter((id) => id === 'srv-B').length;

      expect(countA).toBe(3);
      expect(countB).toBe(1);
    });
  });

  describe('IP Hash', () => {
    it('reliably maps identical client IP to the exact same backend server', () => {
      const iph = new IpHashAlgorithm();
      const mockReqA = { headers: { 'x-forwarded-for': '198.51.100.42' } };
      const mockReqB = { headers: { 'x-forwarded-for': '198.51.100.42' } };

      const s1 = iph.select(mockServers, mockReqA);
      const s2 = iph.select(mockServers, mockReqB);

      expect(s1.id).toBe(s2.id);
    });

    it('falls back gracefully when request headers are missing', () => {
      const iph = new IpHashAlgorithm();
      const s = iph.select(mockServers, null);
      expect(s).toBeDefined();
      expect(mockServers.some((srv) => srv.id === s.id)).toBe(true);
    });
  });

  describe('Factory', () => {
    it('creates appropriate algorithm instance by string identifier', () => {
      expect(createAlgorithm('round-robin').name).toBe('round-robin');
      expect(createAlgorithm('least-connections').name).toBe('least-connections');
      expect(createAlgorithm('weighted-round-robin').name).toBe('weighted-round-robin');
      expect(createAlgorithm('ip-hash').name).toBe('ip-hash');
      expect(createAlgorithm('unknown').name).toBe('round-robin');
    });
  });
});

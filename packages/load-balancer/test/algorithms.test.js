import { describe, it, expect } from 'vitest';
import {
  RoundRobinAlgorithm,
  LeastConnectionsAlgorithm,
  WeightedRoundRobinAlgorithm,
  IpHashAlgorithm,
  createAlgorithm,
} from '../src/algorithms/index.js';

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
    it('distributes requests proportionally to server weights', () => {
      const wrr = new WeightedRoundRobinAlgorithm();
      const servers = [
        { id: 'srv-A', weight: 1 },
        { id: 'srv-B', weight: 3 },
      ];

      const counts = { 'srv-A': 0, 'srv-B': 0 };
      for (let i = 0; i < 40; i++) {
        const s = wrr.select(servers);
        counts[s.id]++;
      }

      expect(counts['srv-A']).toBe(10);
      expect(counts['srv-B']).toBe(30);
    });
  });

  describe('IP Hash', () => {
    it('consistently routes the same client IP to the same server', () => {
      const ipHash = new IpHashAlgorithm();
      const reqA = { headers: { 'x-forwarded-for': '192.168.1.100' } };
      const reqB = { headers: { 'x-forwarded-for': '10.0.0.55' } };

      const firstChoiceA = ipHash.select(mockServers, reqA);
      const secondChoiceA = ipHash.select(mockServers, reqA);
      const thirdChoiceA = ipHash.select(mockServers, reqA);

      expect(firstChoiceA.id).toBe(secondChoiceA.id);
      expect(secondChoiceA.id).toBe(thirdChoiceA.id);

      const choiceB = ipHash.select(mockServers, reqB);
      expect(choiceB).toBeDefined();
    });
  });

  describe('Factory function createAlgorithm', () => {
    it('creates appropriate algorithm instances', () => {
      expect(createAlgorithm('round-robin').name).toBe('round-robin');
      expect(createAlgorithm('least-connections').name).toBe('least-connections');
      expect(createAlgorithm('weighted-round-robin').name).toBe('weighted-round-robin');
      expect(createAlgorithm('ip-hash').name).toBe('ip-hash');
    });
  });
});

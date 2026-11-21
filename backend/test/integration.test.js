import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLoadBalancer } from '../src/load-balancer/index.js';
import { AutoscalerController } from '../src/autoscaler/controller.js';
import { DatabaseService } from '../src/autoscaler/db.js';
import { PolicyEngine } from '../src/autoscaler/policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const integrationDbPath = path.resolve(__dirname, 'integration.sqlite');

describe('Acceptance Criterion 10: End-to-End Autoscaling Integration Test', () => {
  let lb;
  let controller;
  let db;
  let policy;
  let spawnedCount = 0;

  const lbPort = 8180;
  const lbAdminPort = 8181;
  const lbAdminUrl = `http://127.0.0.1:${lbAdminPort}`;

  const testProvisioner = {
    name: 'test-provisioner',
    instances: new Map(),
    async start() {
      spawnedCount++;
      const id = `int-srv-${spawnedCount}`;
      const url = `http://127.0.0.1:999${spawnedCount}`;
      const rec = { id, url, state: 'healthy', startedAt: Date.now() };
      this.instances.set(id, rec);
      return rec;
    },
    async stop(id) {
      this.instances.delete(id);
      return true;
    },
    async list() {
      return Array.from(this.instances.values());
    },
    on() {},
  };

  beforeAll(async () => {
    if (fs.existsSync(integrationDbPath)) {
      try {
        fs.unlinkSync(integrationDbPath);
      } catch (_err) {
        void _err;
      }
    }

    lb = createLoadBalancer({
      port: lbPort,
      adminPort: lbAdminPort,
      adminToken: 'int-token',
    });
    await lb.start();

    db = new DatabaseService(integrationDbPath);
    policy = new PolicyEngine({
      minServers: 2,
      maxServers: 5,
      outCpu: 60,
      outRps: 100,
      inCpu: 20,
      inRps: 30,
      outBreachNeeded: 1,
      inBreachNeeded: 1,
      cooldownOutMs: 0,
      cooldownInMs: 0,
    });

    controller = new AutoscalerController({
      lbAdminUrl,
      lbUrl: `http://127.0.0.1:${lbPort}`,
      adminToken: 'int-token',
      db,
      policy,
      provisioner: testProvisioner,
      evalIntervalMs: 60000,
      drainTimeoutMs: 1000,
    });

    while (controller.servers.size < 2) {
      await controller.scaleOut(1, 'Baseline init');
    }
  });

  afterAll(async () => {
    if (controller) await controller.stop();
    if (lb) await lb.stop();
    if (fs.existsSync(integrationDbPath)) {
      try {
        fs.unlinkSync(integrationDbPath);
      } catch (_err) {
        void _err;
      }
    }
  });

  it('starts with minServers in both controller and load balancer pool', async () => {
    expect(controller.servers.size).toBe(2);
    const lbPoolRes = await fetch(`${lbAdminUrl}/admin/pool`, {
      headers: { Authorization: 'Bearer int-token' },
    });
    expect(lbPoolRes.status).toBe(200);
    const poolData = await lbPoolRes.json();
    expect(poolData.totalServers).toBe(2);
    expect(poolData.healthyServers).toBe(2);
  });

  it('detects high load, triggers scale-out, registers new node with LB', async () => {
    const serversBefore = controller.servers.size;

    controller.metricsStore.push({
      ts: Date.now(),
      rps: 250,
      activeConnections: 10,
      avgLatencyMs: 120,
      p95LatencyMs: 250,
      errorRate: 0,
      cpuAvg: 42.5,
    });

    const load = controller.metricsStore.computeLoad(30, serversBefore);
    const decision = policy.evaluate({
      load,
      currentServerCount: serversBefore,
      now: Date.now(),
    });

    expect(decision.action).toBe('SCALE_OUT');

    await controller.scaleOut(decision.count, decision.reason, load);

    expect(controller.servers.size).toBeGreaterThan(2);

    const lbPoolRes = await fetch(`${lbAdminUrl}/admin/pool`, {
      headers: { Authorization: 'Bearer int-token' },
    });
    const poolData = await lbPoolRes.json();
    expect(poolData.totalServers).toBe(serversBefore + decision.count);

    const events = db.getEvents(10);
    const scaleOutEvent = events.find((e) => e.type === 'SCALE_OUT');
    expect(scaleOutEvent).toBeDefined();
    expect(scaleOutEvent.reason).toContain('High load');
  });

  it('detects idle load, triggers graceful scale-in, drains and removes node from LB without dropping below minServers', async () => {
    const serversBefore = controller.servers.size;
    expect(serversBefore).toBeGreaterThan(2);

    controller.metricsStore.clear();
    controller.metricsStore.push({
      ts: Date.now(),
      rps: 10,
      activeConnections: 0,
      avgLatencyMs: 20,
      p95LatencyMs: 35,
      errorRate: 0,
      cpuAvg: 4.2,
    });

    const load = controller.metricsStore.computeLoad(30, serversBefore);
    const decision = policy.evaluate({
      load,
      currentServerCount: serversBefore,
      now: Date.now(),
    });

    expect(decision.action).toBe('SCALE_IN');

    await controller.scaleIn(decision.count, decision.reason, load);

    expect(controller.servers.size).toBe(serversBefore - decision.count);
    expect(controller.servers.size).toBeGreaterThanOrEqual(2);

    const lbPoolRes = await fetch(`${lbAdminUrl}/admin/pool`, {
      headers: { Authorization: 'Bearer int-token' },
    });
    const poolData = await lbPoolRes.json();
    expect(poolData.totalServers).toBe(serversBefore - decision.count);

    const events = db.getEvents(10);
    const scaleInEvent = events.find((e) => e.type === 'SCALE_IN');
    expect(scaleInEvent).toBeDefined();
    expect(scaleInEvent.reason).toContain('Idle load');
  });
});

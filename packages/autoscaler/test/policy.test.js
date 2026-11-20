import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../src/policy.js';

describe('Autoscaler Policy Engine Unit Tests', () => {
  let policy;

  beforeEach(() => {
    policy = new PolicyEngine({
      minServers: 2,
      maxServers: 10,
      outCpu: 70,
      outRps: 100,
      outLatency: 500,
      inCpu: 30,
      inRps: 40,
      outBreachNeeded: 3,
      inBreachNeeded: 6,
      cooldownOutMs: 30000,
      cooldownInMs: 90000,
    });
  });

  it('maintains status quo (NONE) when metrics are within normal operating bounds', () => {
    const normalLoad = { cpu: 50, rpsPerServer: 70, p95: 120 };
    const decision = policy.evaluate({ load: normalLoad, currentServerCount: 4, now: 1000 });
    expect(decision.action).toBe('NONE');
    expect(decision.count).toBe(0);
  });

  describe('Scale Out Logic & Breach Counting', () => {
    const highLoad = { cpu: 85, rpsPerServer: 120, p95: 350 };

    it('requires 3 consecutive breaches before triggering scale out', () => {
      let d = policy.evaluate({ load: highLoad, currentServerCount: 3, now: 1000 });
      expect(d.action).toBe('NONE');
      expect(policy.getState().outBreaches).toBe(1);

      d = policy.evaluate({ load: highLoad, currentServerCount: 3, now: 6000 });
      expect(d.action).toBe('NONE');
      expect(policy.getState().outBreaches).toBe(2);

      d = policy.evaluate({ load: highLoad, currentServerCount: 3, now: 11000 });
      expect(d.action).toBe('SCALE_OUT');
      expect(d.count).toBe(1);
    });

    it('resets breach counter if load drops back to normal before threshold count', () => {
      policy.evaluate({ load: highLoad, currentServerCount: 3, now: 1000 });
      policy.evaluate({ load: highLoad, currentServerCount: 3, now: 6000 });
      expect(policy.getState().outBreaches).toBe(2);

      const normalLoad = { cpu: 45, rpsPerServer: 50, p95: 100 };
      const d = policy.evaluate({ load: normalLoad, currentServerCount: 3, now: 11000 });
      expect(d.action).toBe('NONE');
      expect(policy.getState().outBreaches).toBe(0);
    });

    it('enforces scale-out cooldown period (30s) before allowing another scale out', () => {
      policy.evaluate({ load: highLoad, currentServerCount: 3, now: 1000 });
      policy.evaluate({ load: highLoad, currentServerCount: 3, now: 6000 });
      const firstScale = policy.evaluate({ load: highLoad, currentServerCount: 3, now: 11000 });
      expect(firstScale.action).toBe('SCALE_OUT');

      policy.evaluate({ load: highLoad, currentServerCount: 4, now: 16000 });
      policy.evaluate({ load: highLoad, currentServerCount: 4, now: 21000 });
      const duringCooldown = policy.evaluate({ load: highLoad, currentServerCount: 4, now: 26000 });
      expect(duringCooldown.action).toBe('NONE');

      policy.evaluate({ load: highLoad, currentServerCount: 4, now: 31000 });
      policy.evaluate({ load: highLoad, currentServerCount: 4, now: 36000 });
      const afterCooldown = policy.evaluate({ load: highLoad, currentServerCount: 4, now: 42000 });
      expect(afterCooldown.action).toBe('SCALE_OUT');
    });

    it('steps up by +2 when load exceeds 150% of threshold', () => {
      const extremeLoad = { cpu: 92, rpsPerServer: 180, p95: 750 };
      policy.evaluate({ load: extremeLoad, currentServerCount: 3, now: 1000 });
      policy.evaluate({ load: extremeLoad, currentServerCount: 3, now: 6000 });
      const d = policy.evaluate({ load: extremeLoad, currentServerCount: 3, now: 11000 });
      expect(d.action).toBe('SCALE_OUT');
      expect(d.count).toBe(2);
    });

    it('never exceeds maxServers hard cap', () => {
      const extremeLoad = { cpu: 90, rpsPerServer: 160, p95: 600 };
      policy.evaluate({ load: extremeLoad, currentServerCount: 9, now: 1000 });
      policy.evaluate({ load: extremeLoad, currentServerCount: 9, now: 6000 });
      const d = policy.evaluate({ load: extremeLoad, currentServerCount: 9, now: 11000 });
      expect(d.action).toBe('SCALE_OUT');
      expect(d.count).toBe(1);

      const atMax = policy.evaluate({ load: extremeLoad, currentServerCount: 10, now: 50000 });
      expect(atMax.action).toBe('NONE');
    });
  });

  describe('Scale In Logic & Anti-Flapping', () => {
    const idleLoad = { cpu: 15, rpsPerServer: 20, p95: 25 };

    it('requires 6 consecutive evaluations before triggering scale in', () => {
      const baseTime = 100000;
      for (let i = 0; i < 5; i++) {
        const d = policy.evaluate({ load: idleLoad, currentServerCount: 4, now: baseTime + i * 5000 });
        expect(d.action).toBe('NONE');
        expect(policy.getState().inBreaches).toBe(i + 1);
      }

      const d6 = policy.evaluate({ load: idleLoad, currentServerCount: 4, now: baseTime + 5 * 5000 });
      expect(d6.action).toBe('SCALE_IN');
      expect(d6.count).toBe(1);
    });

    it('never scales below minServers', () => {
      const baseTime = 200000;
      for (let i = 0; i < 5; i++) {
        policy.evaluate({ load: idleLoad, currentServerCount: 2, now: baseTime + i * 5000 });
      }
      const d = policy.evaluate({ load: idleLoad, currentServerCount: 2, now: baseTime + 25000 });
      expect(d.action).toBe('NONE');
    });

    it('enforces 90s cooldown on scale-in to prevent flapping', () => {
      const t0 = 100000;
      for (let i = 0; i < 6; i++) {
        policy.evaluate({ load: idleLoad, currentServerCount: 5, now: t0 + i * 5000 });
      }
      expect(policy.getState().lastScaleInTime).toBe(t0 + 25000);

      for (let i = 0; i < 6; i++) {
        policy.evaluate({ load: idleLoad, currentServerCount: 4, now: t0 + 30000 + i * 5000 });
      }
      const duringCooldown = policy.evaluate({
        load: idleLoad,
        currentServerCount: 4,
        now: t0 + 55000,
      });
      expect(duringCooldown.action).toBe('NONE');
    });
  });

  describe('Pause & Scheduled Scaling', () => {
    it('halts scaling decisions when paused', () => {
      policy.updateConfig({ isPaused: true });
      const extremeLoad = { cpu: 95, rpsPerServer: 200, p95: 800 };
      for (let i = 0; i < 5; i++) {
        const d = policy.evaluate({ load: extremeLoad, currentServerCount: 2, now: 1000 + i * 5000 });
        expect(d.action).toBe('NONE');
      }
    });

    it('respects scheduled scaling rules for higher minimum fleet', () => {
      policy.updateConfig({
        scheduledRules: [{ minServers: 5, startHour: 9, endHour: 18, enabled: true }],
      });

      const dayDate = new Date('2026-11-20T12:00:00');
      const nightDate = new Date('2026-11-20T22:00:00');

      expect(policy.getEffectiveMinServers(dayDate)).toBe(5);
      expect(policy.getEffectiveMinServers(nightDate)).toBe(2);

      const d = policy.evaluate({
        load: { cpu: 30, rpsPerServer: 30, p95: 50 },
        currentServerCount: 3,
        now: dayDate.getTime(),
        nowDate: dayDate,
      });
      expect(d.action).toBe('SCALE_OUT');
      expect(d.count).toBe(2);
    });
  });
});

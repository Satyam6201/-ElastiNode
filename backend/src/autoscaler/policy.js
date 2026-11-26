export const DEFAULT_POLICY = {
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
  scaleOutStep: 1,
  scaleInStep: 1,
  isPaused: false,
  scheduledRules: [],
};

export class PolicyEngine {
  constructor(initialConfig = {}) {
    this.config = { ...DEFAULT_POLICY, ...initialConfig };
    this.state = {
      outBreaches: 0,
      inBreaches: 0,
      lastScaleOutTime: -Infinity,
      lastScaleInTime: -Infinity,
      lastAnyScaleTime: -Infinity,
    };
  }

  updateConfig(updates = {}) {
    const newConfig = { ...this.config, ...updates };
    if (newConfig.minServers < 1) newConfig.minServers = 1;
    if (newConfig.maxServers < newConfig.minServers) {
      newConfig.maxServers = newConfig.minServers;
    }
    this.config = newConfig;
    return { ...this.config };
  }

  getConfig() {
    return { ...this.config };
  }

  getState() {
    return { ...this.state };
  }

  getEffectiveMinServers(nowDate = new Date()) {
    let min = this.config.minServers;
    const currentHour = nowDate.getHours();

    for (const rule of this.config.scheduledRules || []) {
      if (rule.enabled && currentHour >= rule.startHour && currentHour < rule.endHour) {
        if (rule.minServers > min) {
          min = rule.minServers;
        }
      }
    }
    return Math.min(min, this.config.maxServers);
  }

  evaluate({ load, currentServerCount, now = Date.now(), nowDate = new Date(now) }) {
    if (this.config.isPaused) {
      return { action: 'NONE', count: 0, reason: 'Autoscaling is paused by user' };
    }

    const effectiveMin = this.getEffectiveMinServers(nowDate);
    const max = this.config.maxServers;
    const count = currentServerCount;

    if (count < effectiveMin) {
      const step = effectiveMin - count;
      return {
        action: 'SCALE_OUT',
        count: step,
        reason: `Server count (${count}) is below minimum target (${effectiveMin})`,
      };
    }

    if (count > max) {
      const step = count - max;
      return {
        action: 'SCALE_IN',
        count: step,
        reason: `Server count (${count}) exceeds maximum limit (${max})`,
      };
    }

    const isOverloaded =
      (load.cpu > 0 && load.cpu > this.config.outCpu) ||
      load.rpsPerServer > this.config.outRps ||
      load.p95 > this.config.outLatency;

    const isIdle = load.cpu < this.config.inCpu && load.rpsPerServer < this.config.inRps;

    this.state.outBreaches = isOverloaded ? this.state.outBreaches + 1 : 0;
    this.state.inBreaches = isIdle ? this.state.inBreaches + 1 : 0;

    if (
      this.state.outBreaches >= this.config.outBreachNeeded &&
      count < max &&
      now - this.state.lastScaleOutTime > this.config.cooldownOutMs
    ) {
      const isExtremeLoad =
        load.rpsPerServer > this.config.outRps * 1.5 ||
        load.cpu > Math.min(95, this.config.outCpu * 1.3);

      const desiredStep = isExtremeLoad ? 2 : 1;
      const actualCount = Math.min(desiredStep, max - count);

      this.state.outBreaches = 0;
      this.state.lastScaleOutTime = now;
      this.state.lastAnyScaleTime = now;

      const reason = `High load: CPU ${load.cpu}% (threshold ${this.config.outCpu}%), RPS/srv ${load.rpsPerServer} (threshold ${this.config.outRps}), p95 ${load.p95}ms`;
      return { action: 'SCALE_OUT', count: actualCount, reason };
    }

    if (
      this.state.inBreaches >= this.config.inBreachNeeded &&
      count > effectiveMin &&
      now - this.state.lastAnyScaleTime > this.config.cooldownInMs
    ) {
      const actualCount = Math.min(this.config.scaleInStep || 1, count - effectiveMin);

      this.state.inBreaches = 0;
      this.state.lastScaleInTime = now;
      this.state.lastAnyScaleTime = now;

      const reason = `Idle load: CPU ${load.cpu}% (<${this.config.inCpu}%), RPS/srv ${load.rpsPerServer} (<${this.config.inRps})`;
      return { action: 'SCALE_IN', count: actualCount, reason };
    }

    return { action: 'NONE', count: 0, reason: 'Load within normal operating bounds' };
  }

  reset() {
    this.state = {
      outBreaches: 0,
      inBreaches: 0,
      lastScaleOutTime: -Infinity,
      lastScaleInTime: -Infinity,
      lastAnyScaleTime: -Infinity,
    };
  }
}

export default PolicyEngine;

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createLogger } from '@elastinode/shared';

const require = createRequire(import.meta.url);
const logger = createLogger('autoscaler-db');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.resolve(__dirname, '../../data/elastinode.sqlite');

export class DatabaseService {
  constructor(dbPath = defaultDbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.driver = 'none';
    this.init();
  }

  init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const BetterSqlite = require('better-sqlite3');
      this.db = new BetterSqlite(this.dbPath);
      this.driver = 'better-sqlite3';
      logger.info({ path: this.dbPath, driver: 'better-sqlite3' }, 'SQLite database initialized');
    } catch {
      try {
        const { DatabaseSync } = require('node:sqlite');
        this.db = new DatabaseSync(this.dbPath);
        this.driver = 'node:sqlite';
        logger.info({ path: this.dbPath, driver: 'node:sqlite' }, 'SQLite database initialized');
      } catch (err) {
        logger.warn({ err: err.message }, 'Native SQLite not available; using in-memory store');
        this.driver = 'memory';
        this.memoryStore = { events: [], metrics: [], policy: null };
      }
    }

    this.createTables();
  }

  createTables() {
    if (this.driver === 'memory') return;

    const schema = `
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER,
        type TEXT,
        serverId TEXT,
        reason TEXT,
        serversBefore INTEGER,
        serversAfter INTEGER,
        metricsJson TEXT
      );
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER,
        rps REAL,
        avgLatency REAL,
        p95Latency REAL,
        cpuAvg REAL,
        activeConns INTEGER,
        serverCount INTEGER,
        errorRate REAL
      );
      CREATE TABLE IF NOT EXISTS policy (
        id INTEGER PRIMARY KEY,
        json TEXT
      );
    `;

    this.exec(schema);
  }

  exec(sql) {
    if (this.driver === 'better-sqlite3' || this.driver === 'node:sqlite') {
      this.db.exec(sql);
    }
  }

  insertEvent({ type, serverId = null, reason = '', serversBefore = 0, serversAfter = 0, metrics = {} }) {
    const ts = Date.now();
    const metricsJson = JSON.stringify(metrics);

    if (this.driver === 'memory') {
      const id = this.memoryStore.events.length + 1;
      const row = { id, ts, type, serverId, reason, serversBefore, serversAfter, metricsJson };
      this.memoryStore.events.unshift(row);
      return id;
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (ts, type, serverId, reason, serversBefore, serversAfter, metricsJson)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ts, type, serverId, reason, serversBefore, serversAfter, metricsJson);
    return info.lastInsertRowid;
  }

  getEvents(limit = 50) {
    if (this.driver === 'memory') {
      return this.memoryStore.events.slice(0, limit);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM events ORDER BY ts DESC LIMIT ?
    `);
    return stmt.all(limit);
  }

  insertMetric({ rps = 0, avgLatency = 0, p95Latency = 0, cpuAvg = 0, activeConns = 0, serverCount = 0, errorRate = 0 }) {
    const ts = Date.now();

    if (this.driver === 'memory') {
      const id = this.memoryStore.metrics.length + 1;
      const row = { id, ts, rps, avgLatency, p95Latency, cpuAvg, activeConns, serverCount, errorRate };
      this.memoryStore.metrics.push(row);
      return id;
    }

    const stmt = this.db.prepare(`
      INSERT INTO metrics (ts, rps, avgLatency, p95Latency, cpuAvg, activeConns, serverCount, errorRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ts, rps, avgLatency, p95Latency, cpuAvg, activeConns, serverCount, errorRate);
    return info.lastInsertRowid;
  }

  getMetrics(rangeMs = 15 * 60 * 1000) {
    const since = Date.now() - rangeMs;

    if (this.driver === 'memory') {
      return this.memoryStore.metrics.filter((m) => m.ts >= since);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM metrics WHERE ts >= ? ORDER BY ts ASC
    `);
    return stmt.all(since);
  }

  pruneMetrics(olderThanMs = 24 * 60 * 60 * 1000) {
    const threshold = Date.now() - olderThanMs;

    if (this.driver === 'memory') {
      this.memoryStore.metrics = this.memoryStore.metrics.filter((m) => m.ts >= threshold);
      return;
    }

    const stmt = this.db.prepare(`
      DELETE FROM metrics WHERE ts < ?
    `);
    stmt.run(threshold);
  }

  savePolicy(policyObject) {
    const json = JSON.stringify(policyObject);
    if (this.driver === 'memory') {
      this.memoryStore.policy = json;
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO policy (id, json) VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET json = excluded.json
    `);
    stmt.run(json);
  }

  getPolicy() {
    if (this.driver === 'memory') {
      return this.memoryStore.policy ? JSON.parse(this.memoryStore.policy) : null;
    }

    const stmt = this.db.prepare(`SELECT json FROM policy WHERE id = 1`);
    const row = stmt.get();
    return row ? JSON.parse(row.json) : null;
  }

  close() {
    if (this.db && typeof this.db.close === 'function') {
      this.db.close();
    }
  }
}

export default DatabaseService;

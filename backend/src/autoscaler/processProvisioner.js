import { EventEmitter } from 'node:events';
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../logger.js';

const logger = createLogger('process-provisioner');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendScriptPath = path.resolve(__dirname, '../server/index.js');

export class ProcessProvisioner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = 'process';
    this.basePort = options.basePort || 4001;
    this.instances = new Map();
    this.nextServerNumber = 1;
  }

  findAvailablePort() {
    const usedPorts = new Set(Array.from(this.instances.values()).map((inst) => inst.port));
    let port = this.basePort;
    while (usedPorts.has(port)) {
      port++;
    }
    return port;
  }

  generateServerId() {
    let id = `srv-${this.nextServerNumber++}`;
    while (this.instances.has(id)) {
      id = `srv-${this.nextServerNumber++}`;
    }
    return id;
  }

  async waitForHealth(url, timeoutMs = 30000) {
    const startTime = Date.now();
    const probeUrl = `${url.replace(/\/$/, '')}/health`;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await fetch(probeUrl, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (body && body.status === 'ok') {
            return true;
          }
        }
      } catch (_err) {
        void _err;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`Health check timed out after ${timeoutMs}ms for ${probeUrl}`);
  }

  async start(options = {}) {
    const port = options.port || this.findAvailablePort();
    const id = options.id || this.generateServerId();
    const url = `http://127.0.0.1:${port}`;

    logger.info({ id, port, url }, 'Spawning backend child process');

    const child = fork(backendScriptPath, [], {
      env: {
        ...process.env,
        PORT: String(port),
        SERVER_ID: id,
        RUN_STANDALONE: 'true',
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    const instanceRecord = {
      id,
      port,
      url,
      child,
      pid: child.pid,
      startedAt: Date.now(),
      state: 'starting',
      isStopping: false,
    };

    this.instances.set(id, instanceRecord);

    child.stdout?.on('data', (data) => {
      logger.debug({ id, output: data.toString().trim() }, 'Backend stdout');
    });

    child.stderr?.on('data', (data) => {
      logger.warn({ id, output: data.toString().trim() }, 'Backend stderr');
    });

    child.on('exit', (code, signal) => {
      logger.info({ id, code, signal }, 'Backend process exited');
      const inst = this.instances.get(id);
      this.instances.delete(id);

      if (inst && !inst.isStopping) {
        logger.error({ id, code, signal }, 'Backend process crashed unexpectedly');
        this.emit('server:crashed', { id, code, signal, url });
      } else {
        this.emit('server:stopped', { id, code, signal });
      }
    });

    child.on('error', (err) => {
      logger.error({ id, err }, 'Child process encountered error');
      this.emit('server:error', { id, error: err });
    });

    try {
      await this.waitForHealth(url, options.healthTimeoutMs || 30000);
      instanceRecord.state = 'healthy';
      logger.info({ id, url }, 'Backend child process verified healthy');
      return { id, url, port, pid: child.pid, startedAt: instanceRecord.startedAt };
    } catch (err) {
      logger.error({ id, err: err.message }, 'Backend health check failed; terminating child');
      child.kill('SIGKILL');
      this.instances.delete(id);
      throw err;
    }
  }

  async stop(id, timeoutMs = 30000) {
    const inst = this.instances.get(id);
    if (!inst) {
      logger.warn({ id }, 'Attempted to stop non-existent process instance');
      return false;
    }

    if (inst.isStopping) {
      return inst.stoppingPromise || true;
    }

    inst.isStopping = true;
    inst.state = 'draining';
    logger.info({ id, pid: inst.pid }, 'Stopping backend process');

    inst.stoppingPromise = new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.instances.delete(id);
          resolve(true);
        }
      };

      const killTimeout = setTimeout(() => {
        if (!resolved) {
          logger.warn({ id, pid: inst.pid }, 'Force killing backend process after timeout');
          try {
            inst.child.kill('SIGKILL');
          } catch (_err) {
            void _err;
          }
          finish();
        }
      }, timeoutMs);

      inst.child.once('exit', () => {
        clearTimeout(killTimeout);
        finish();
      });

      try {
        if (inst.child.connected) {
          inst.child.send({ type: 'shutdown' });
        }
      } catch (_err) {
        void _err;
      }

      try {
        inst.child.kill('SIGTERM');
      } catch {
        clearTimeout(killTimeout);
        finish();
      }
    });

    return inst.stoppingPromise;
  }

  async list() {
    return Array.from(this.instances.values()).map((inst) => ({
      id: inst.id,
      url: inst.url,
      port: inst.port,
      pid: inst.pid,
      state: inst.state,
      startedAt: inst.startedAt,
    }));
  }
}

export default ProcessProvisioner;

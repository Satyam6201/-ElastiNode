import autocannon from 'autocannon';
import { createLogger } from '../logger.js';
import config from '../config.js';

const logger = createLogger('load-tester');

export async function runLoadTest(options = {}) {
  const targetUrl = options.targetUrl || `http://127.0.0.1:${config.lbPort || 8080}`;
  const endpoint = options.endpoint || '/work?ms=20';
  const fullUrl = `${targetUrl.replace(/\/$/, '')}${endpoint}`;
  const duration = options.duration || 30;
  const scenario = options.scenario || 'standard';
  const targetRps = options.rps || 200;
  const connections = options.connections || Math.max(10, Math.min(100, Math.ceil(targetRps / 10)));

  logger.info(
    { targetUrl: fullUrl, duration, scenario, targetRps, connections },
    'Starting autocannon load test scenario'
  );

  let autocannonConfig = {
    url: fullUrl,
    connections,
    duration,
    pipelining: 1,
    headers: {
      'user-agent': 'ElastiNode-LoadTester/1.0',
    },
  };

  if (scenario === 'spike') {
    autocannonConfig.connections = Math.min(200, connections * 3);
    autocannonConfig.duration = Math.max(10, Math.min(30, duration));
  } else if (scenario === 'ramp-up') {
    autocannonConfig.duration = duration;
    autocannonConfig.amount = targetRps * duration;
  }

  return new Promise((resolve, reject) => {
    const instance = autocannon(autocannonConfig, (err, result) => {
      if (err) {
        logger.error({ err }, 'Autocannon run failed');
        return reject(err);
      }

      const summary = {
        requests: result.requests.total,
        rps: Math.round(result.requests.average),
        avgLatencyMs: Math.round(result.latency.average),
        p95LatencyMs: Math.round(result.latency.p97_5 || result.latency.p90 || result.latency.average),
        throughputMb: Math.round((result.throughput.average / (1024 * 1024)) * 10) / 10,
        errors: result.errors,
        timeouts: result.timeouts,
        duration: result.duration,
      };

      logger.info({ summary }, 'Load test scenario finished');
      resolve(summary);
    });

    autocannon.track(instance, { renderProgressBar: false });
  });
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  const args = process.argv.slice(2);
  let duration = 20;
  let rps = 250;
  let scenario = 'standard';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) duration = parseInt(args[++i], 10);
    if (args[i] === '--rps' && args[i + 1]) rps = parseInt(args[++i], 10);
    if (args[i] === '--scenario' && args[i + 1]) scenario = args[++i];
  }

  runLoadTest({ duration, rps, scenario })
    .then((summary) => {
      console.log('Load test completed:', JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Load test error:', err);
      process.exit(1);
    });
}

export default runLoadTest;

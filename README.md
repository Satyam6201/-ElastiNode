# ElastiNode ⚡

> **"Servers that grow when traffic grows, and shrink when it doesn't."**

ElastiNode is an autonomous auto-scaling distributed system with a live reverse proxy Load Balancer, dynamic backend server pool management, graceful connection draining, SQLite event persistence, and a real-time React + Tailwind CSS dashboard.

---

## 🏗 High-Level Architecture

```
                 Clients & Browsers
                         │
                         ▼
        ┌───────────────────────────────────┐
        │       LOAD BALANCER (:8080)       │
        │  • Dynamic Registry Pool          │
        │  • Pluggable Algorithms           │
        │  • Passive/Active Health Probing  │
        │  • Retry on Failure & Draining    │
        │  • 1s Metrics Aggregation Window  │
        └─────────────────┬─────────────────┘
                          │
     ┌────────────────────┼────────────────────┐
     ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Server srv-1 │   │ Server srv-2 │   │ Server srv-N │  (Dynamic Fleet)
│   (:4001)    │   │   (:4002)    │   │   (:400N)    │
└──────▲───────┘   └──────▲───────┘   └──────▲───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │ spawn / terminate
                          ▼
        ┌───────────────────────────────────┐
        │   AUTOSCALER CONTROLLER (:9000)   │
        │  • 5-second Autonomous Loop       │
        │  • Rolling 30s Metrics Store      │
        │  • Asymmetric Breach & Cooldowns  │
        │  • Graceful Zero-Drop Draining    │
        │  • Crash Recovery Engine          │
        │  • SQLite Audit Trail Persistence │
        └─────────────────┬─────────────────┘
                          │
                   Socket.IO + REST
                          │
                          ▼
        ┌───────────────────────────────────┐
        │     REACT DASHBOARD (:3000)       │
        │  • Live Stat Cards (RPS, Latency) │
        │  • Dynamic Server Fleet Grid      │
        │  • Recharts Real-Time Graphs      │
        │  • Autocannon Traffic Generator   │
        │  • Live Policy Configuration Form │
        └───────────────────────────────────┘
```

---

## 🌟 Key Features

1. **Intelligent Load Balancer (`:8080` / Admin `:8081`)**
   - Pluggable load balancing algorithms: `round-robin`, `least-connections`, `weighted-round-robin`, `ip-hash`.
   - **Passive Health Check**: Automatically isolates nodes after 3 consecutive proxy errors.
   - **Active Health Check**: Periodic `/health` probes (2 consecutive failures marks unhealthy; 2 successes restores).
   - **Idempotent Retry**: Retries failed GET/HEAD requests once on an alternate healthy node before responding.
   - **WebSocket Upgrade Proxy**: Seamless bidirectional WebSocket forwarding.
   - **Rate Limiting**: Built-in token-bucket rate limiter per IP.
   - Headers: Injects `X-Served-By: <serverId>` and `X-Request-Id: <uuid>` on every request.

2. **Backend Server Fleet (`:4001` - `:4010`)**
   - Endpoints: `/health`, `/work?ms=200`, `/cpu?n=35`, `/metrics`, `/`.
   - Built-in metrics: reports CPU %, memory RSS, event loop lag, and active in-flight requests.
   - Graceful shutdown: on termination signal, stops accepting connections, drains in-flight requests (up to 30s), then exits.

3. **Autonomous Autoscaler (`:9000`)**
   - **Control Loop (5s)**: Evaluates rolling 30-second sliding window summary.
   - **Anti-Flapping & Hysteresis**:
     - Scale-out requires 3 consecutive breach evaluations (15s); cooldown 30s.
     - Scale-in requires 6 consecutive idle evaluations (30s); cooldown 90s.
     - Dynamic step: scales +1 normally, or +2 during extreme surges (>150% threshold).
   - **Graceful Zero-Downtime Scale-In**:
     - Selects server with fewest active connections.
     - Instructs LB to set node state to `draining`.
     - Waits until `activeConnections == 0` before sending termination signal.
   - **Crash Recovery**: Automatically detects crashed node processes and spawns healthy replacements immediately.
   - **Pluggable Provisioners**:
     - `ProcessProvisioner` (default; forks Node child processes with automatic port allocation).
     - `DockerProvisioner` (Dockerode container lifecycle management with local fallback).
     - `CloudProvisioner` (stubs with documented hooks for AWS ASG & Kubernetes API).

4. **Real-Time React + Tailwind CSS Dashboard (`:3000` or `:9000`)**
   - **Stat Cards**: Instant view of RPS, active sockets, avg/p95 latency, error rates, and fleet capacity.
   - **Server Grid**: Live cards with animated health states, dynamic CPU bars, connection counts, and manual drain actions.
   - **Live Charts**: Real-time throughput, active connections, and latency/CPU with threshold reference lines.
   - **Scaling Timeline**: Audit log of scale-out, scale-in, and server crash events.
   - **Policy Editor**: Live form to update min/max, CPU/RPS thresholds, cooldowns, and pause/resume scaling.
   - **Integrated Load Generator**: Autocannon scenarios (Sustained, Spike 10x, Ramp-up) with custom sliders.

---

## 📋 Port Allocations

| Service | Port | Description |
|---|---|---|
| Load Balancer Proxy | `8080` | Public reverse proxy entry point for all traffic |
| Load Balancer Admin API | `8081` | Dynamic registry, draining, algorithm swapping (localhost only) |
| Autoscaler Service | `9000` | REST API, Socket.IO server, and static dashboard host |
| React Dashboard (Dev) | `3000` | Vite development server with hot-reload |
| Backend Nodes | `4001+` | Dynamically provisioned Node.js Express microservices |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (tested on Node v22.14.0)
- npm 10+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Full Test Suite
Runs all 57 unit, integration, and policy tests across the monorepo:
```bash
npm test
```

### 3. Start ElastiNode
Starts the Load Balancer, Autoscaler, baseline `minServers` (2 nodes), and the React Dashboard:
```bash
npm run dev
```

Open your browser to:
- **Interactive Dashboard**: [http://localhost:3000](http://localhost:3000) (or [http://localhost:9000](http://localhost:9000))
- **Load Balancer Proxy**: [http://localhost:8080](http://localhost:8080)

---

## 🧪 Demo Walkthrough

### Scenario 1: Verify Round-Robin Load Balancing
Send 10 requests to the Load Balancer:
```bash
# In PowerShell:
1..10 | ForEach-Object { (Invoke-WebRequest -Uri "http://localhost:8080/health").Headers['X-Served-By'] }
```
**Result**: Requests alternate evenly between `srv-1` and `srv-2`.

### Scenario 2: Automatic Scale-Out Under Load
1. Open the Dashboard at [http://localhost:3000](http://localhost:3000).
2. In the **Live Load Generator** panel, set:
   - Target Throughput: `350 RPS`
   - Test Duration: `30s`
   - Pattern: `Spike (10x)`
3. Click **Launch Load Test** (or run `npm run loadtest -- --rps 350 --duration 30`).
4. **Observe**:
   - RPS climbs immediately on the Throughput chart.
   - Within 15 seconds (3 consecutive breach intervals), the Autoscaler logs `SCALE_OUT` in the timeline.
   - New server instances (`srv-3`, `srv-4`) appear in the fleet grid.
   - The Load Balancer immediately routes incoming traffic to the newly spawned nodes.

### Scenario 3: Graceful Scale-In (Zero Dropped Requests)
1. Stop or let the load test conclude.
2. Load drops below idle thresholds (`CPU < 30%` and `RPS/srv < 40`).
3. After 6 consecutive idle intervals (30s) and scale-in cooldown, the Autoscaler marks the lowest-traffic node as `draining`.
4. The node card fades, finishes existing active requests, terminates gracefully without dropping client connections, and is removed from the LB pool.
5. The fleet contracts back to `minServers` (2).

### Scenario 4: Automatic Crash Recovery
1. In the Dashboard server grid, manually drain a server or kill a backend PID from task manager/terminal.
2. The Load Balancer passively detects the failure and routes requests to the remaining healthy node.
3. The Autoscaler detects the crash, logs `SERVER_FAILED`, and immediately launches a replacement server to restore the minimum target capacity.

---

## ⚙️ Configuration (.env)

```env
# Load Balancer
LB_PORT=8080
LB_ADMIN_PORT=8081
LB_ALGORITHM=round-robin

# Autoscaler
AUTOSCALER_PORT=9000
PROVISIONER=process
BACKEND_BASE_PORT=4001
MIN_SERVERS=2
MAX_SERVERS=10
EVAL_INTERVAL_MS=5000
HEALTH_INTERVAL_MS=5000
DRAIN_TIMEOUT_MS=30000

# Security
ADMIN_TOKEN=change-me
NODE_ENV=development
```

---

## 🐳 Docker Deployment

To launch ElastiNode using Docker Compose:
```bash
docker compose up --build
```
This builds and starts the Load Balancer and Autoscaler container fleet in an isolated network bridge.

---

## 🛠 Development Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Load Balancer, Autoscaler (with baseline nodes), and React Dashboard |
| `npm test` | Runs the full Vitest suite (policy, algorithms, pool, provisioners, integration) |
| `npm run lint` | Runs ESLint across all packages and scripts |
| `npm run format` | Runs Prettier code formatting |
| `npm run build` | Builds the production Vite React dashboard bundle |
| `npm run loadtest` | Runs the autocannon CLI traffic scenario |

---

## 📜 License
MIT &copy; 2026 ElastiNode Team

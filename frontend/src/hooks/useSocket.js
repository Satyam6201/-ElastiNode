import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_BASE = window.location.port === '3000' ? '' : 'http://127.0.0.1:9000';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [servers, setServers] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [mode, setMode] = useState('auto');
  const [isScaling, setIsScaling] = useState(false);
  const socketRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    try {
      const [statusRes, eventsRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`),
        fetch(`${API_BASE}/api/events?limit=20`),
        fetch(`${API_BASE}/api/metrics?range=5m`),
      ]);

      if (statusRes.ok) {
        const s = await statusRes.json();
        setServers(s.servers || []);
        setPolicy(s.policy || null);
        setMode(s.mode || 'auto');
        setIsScaling(Boolean(s.isScaling));
      }

      if (eventsRes.ok) {
        const e = await eventsRes.json();
        setEvents(e.events || []);
      }

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (Array.isArray(m.metrics) && m.metrics.length > 0) {
          setMetricsHistory(m.metrics);
        }
      }
    } catch (err) {
      console.warn('Failed to load initial status:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    const socket = io(API_BASE || 'http://127.0.0.1:9000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('metrics', (snapshot) => {
      setLatestMetric(snapshot);
      setMetricsHistory((prev) => {
        const updated = [...prev, snapshot];
        return updated.slice(-60);
      });
    });

    socket.on('servers', (serverList) => {
      setServers(serverList || []);
    });

    socket.on('scaling-event', (eventData) => {
      setEvents((prev) => [eventData, ...prev.slice(0, 49)]);
    });

    socket.on('policy-updated', (updatedPolicy) => {
      setPolicy(updatedPolicy);
      setMode(updatedPolicy.isPaused ? 'paused' : 'auto');
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshStatus]);

  const updatePolicy = async (updates) => {
    const res = await fetch(`${API_BASE}/api/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setPolicy(data.policy);
      return data;
    }
    throw new Error('Failed to update policy');
  };

  const manualScale = async (action, count = 1, serverId = null) => {
    const res = await fetch(`${API_BASE}/api/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, count, serverId }),
    });
    return res.json();
  };

  const togglePause = async () => {
    const endpoint = mode === 'paused' ? '/api/autoscaling/resume' : '/api/autoscaling/pause';
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setMode(data.isPaused ? 'paused' : 'auto');
    }
  };

  const triggerLoadTest = async ({ rps, duration, scenario }) => {
    const res = await fetch(`${API_BASE}/api/loadtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rps, duration, scenario }),
    });
    return res.json();
  };

  return {
    isConnected,
    servers,
    latestMetric,
    metricsHistory,
    events,
    policy,
    mode,
    isScaling,
    updatePolicy,
    manualScale,
    togglePause,
    triggerLoadTest,
    refreshStatus,
  };
}

export default useSocket;

import { jsonResponse } from '../_shared/security.js';

/**
 * Health Check & Uptime Monitoring Endpoint
 * Pings Cloudflare D1 to verify edge functions and database health.
 * Perfect for UptimeRobot, BetterUptime, Pingdom, etc.
 */
export async function onRequestGet({ env }) {
  const startedAt = Date.now();
  let dbStatus = 'disconnected';

  if (env.DB) {
    try {
      const res = await env.DB.prepare('SELECT 1 AS alive').first();
      if (res?.alive === 1) {
        dbStatus = 'healthy';
      }
    } catch {
      dbStatus = 'error';
    }
  }

  const isHealthy = dbStatus === 'healthy';
  const latencyMs = Date.now() - startedAt;

  return jsonResponse(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'tubemetrix',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      latencyMs,
    },
    isHealthy ? 200 : 503
  );
}

export async function onRequestHead() {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache',
    },
  });
}


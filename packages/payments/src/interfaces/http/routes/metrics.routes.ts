import { Elysia } from 'elysia'
import type { MetricsSnapshot } from '../../../infrastructure/persistence/drizzle/metrics.repository'

/**
 * `GET /metrics` — contadores de backlog/lag para monitoramento (sem auth;
 * exponha apenas na rede interna ou proteja no proxy).
 */
export function metricsRoutes(getMetrics: () => Promise<MetricsSnapshot>) {
  return new Elysia().get('/metrics', () => getMetrics())
}

import { Elysia } from 'elysia'

/** Resultado do probe de readiness (montado no composition-root). */
export interface ReadinessResult {
  ready: boolean
  /** Estado por dependência (ex.: `{ db: 'ok' }`). */
  checks: Record<string, string>
}

export type ReadinessProbe = () => Promise<ReadinessResult>

/**
 * Liveness (`/health`) e readiness (`/readyz`: banco alcançável). O healthcheck do
 * Railway aponta para `/readyz`. Espelha o members/payments.
 */
export function healthRoutes(readiness: ReadinessProbe) {
  return new Elysia()
    .get('/health', () => ({
      status: 'ok',
      service: 'hub',
      time: new Date().toISOString(),
    }))
    .get('/readyz', async ({ set }) => {
      const result = await readiness()
      if (!result.ready) set.status = 503
      return { status: result.ready ? 'ready' : 'unavailable', checks: result.checks }
    })
}

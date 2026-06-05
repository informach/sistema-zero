import { Elysia } from 'elysia'

/** Resultado do probe de readiness (montado no composition-root). */
export interface ReadinessResult {
  ready: boolean
  /** Estado por dependência (ex.: `{ db: 'ok' }`). */
  checks: Record<string, string>
}

export type ReadinessProbe = () => Promise<ReadinessResult>

/**
 * Liveness (`/health`: processo de pé → 200, sempre) e readiness (`/readyz`:
 * pronto para receber TRÁFEGO — banco alcançável). O healthcheck do Railway
 * deve apontar para `/readyz`: sem ele, a réplica nova é promovida antes de
 * conseguir falar com o Postgres. Espelha o payments.
 */
export function healthRoutes(readiness: ReadinessProbe) {
  return new Elysia()
    .get('/health', () => ({
      status: 'ok',
      service: 'members',
      time: new Date().toISOString(),
    }))
    .get('/readyz', async ({ set }) => {
      const result = await readiness()
      if (!result.ready) set.status = 503
      return { status: result.ready ? 'ready' : 'unavailable', checks: result.checks }
    })
}

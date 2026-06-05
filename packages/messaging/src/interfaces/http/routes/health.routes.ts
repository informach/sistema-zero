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
 * pronto para receber TRÁFEGO — banco respondendo). Aponte o healthcheck do
 * deploy para `/readyz` (espelha o payments).
 */
export function healthRoutes(readiness: ReadinessProbe) {
  return new Elysia()
    .get('/health', () => ({ status: 'ok', service: 'messaging' }))
    .get('/readyz', async ({ set }) => {
      const result = await readiness()
      if (!result.ready) set.status = 503
      return { status: result.ready ? 'ready' : 'unavailable', checks: result.checks }
    })
}

import { Elysia } from 'elysia'

/** Resultado do probe de readiness (montado no composition-root). */
export interface ReadinessResult {
  ready: boolean
  /** Estado por dependência (ex.: `{ db: 'ok', efiWarmup: 'pending' }`). */
  checks: Record<string, string>
}

export type ReadinessProbe = () => Promise<ReadinessResult>

/**
 * Liveness (`/health`: processo de pé → 200, sempre) e readiness (`/readyz`:
 * pronto para receber TRÁFEGO). O healthcheck do Railway aponta para `/readyz` —
 * uma réplica nova só é promovida quando o banco responde E o warm-up da Efí
 * terminou (senão o 1º Pix paga o handshake mTLS frio de ~15s dentro da request
 * → 502 no funil; era exatamente a regressão do redeploy).
 */
export function healthRoutes(readiness: ReadinessProbe) {
  return new Elysia()
    .get('/health', () => ({
      status: 'ok',
      service: 'payments',
      time: new Date().toISOString(),
    }))
    .get('/readyz', async ({ set }) => {
      const result = await readiness()
      if (!result.ready) set.status = 503
      return { status: result.ready ? 'ready' : 'unavailable', checks: result.checks }
    })
}

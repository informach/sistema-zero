import { Elysia } from 'elysia'

export type ReadinessProbe = () => Promise<{ ready: boolean; checks: Record<string, string> }>

/** Liveness (`/health`) e readiness (`/readyz`, healthcheck do Railway). */
export function healthRoutes(readiness: ReadinessProbe) {
  return new Elysia()
    .get('/health', () => ({ status: 'ok' }))
    .get('/readyz', async ({ set }) => {
      const result = await readiness()
      if (!result.ready) set.status = 503
      return { status: result.ready ? 'ok' : 'unavailable', checks: result.checks }
    })
}

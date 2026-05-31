import { Elysia } from 'elysia'

/** Endpoints de liveness. (Readiness com ping de banco pode ser adicionado.) */
export function healthRoutes() {
  return new Elysia().get('/health', () => ({
    status: 'ok',
    service: 'payments',
    time: new Date().toISOString(),
  }))
}

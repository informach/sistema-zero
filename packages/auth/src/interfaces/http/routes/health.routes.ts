import { Elysia } from 'elysia'

/** Endpoint de liveness. */
export function healthRoutes() {
  return new Elysia().get('/health', () => ({
    status: 'ok',
    service: 'auth',
    time: new Date().toISOString(),
  }))
}

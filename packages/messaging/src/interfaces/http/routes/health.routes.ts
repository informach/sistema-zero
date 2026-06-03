import { Elysia } from 'elysia'

export function healthRoutes() {
  return new Elysia().get('/health', () => ({ status: 'ok', service: 'messaging' }))
}

import type { APIRoute } from 'astro'

export const prerender = false

/** Healthcheck consumido pelo api-gateway (upstreamGroups[].healthCheckPath). */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok', service: 'funnel' }), {
    headers: { 'content-type': 'application/json' },
  })

import type { APIRoute } from 'astro'
import { analyticsConsent, analyticsIngest, analyticsSession } from '../../../analytics/handlers'
import { analyticsDeps } from '../../../analytics/runtime'
import { getDeps } from '../../../server/deps'

export const prerender = false
export const POST: APIRoute = async ({ request, params }) => {
  if (!['consent', 'session', 'events'].includes(params.action ?? ''))
    return new Response(null, { status: 404 })
  const handler = { consent: analyticsConsent, session: analyticsSession, events: analyticsIngest }[
    params.action ?? ''
  ]
  if (!handler) return new Response(null, { status: 404 })
  try {
    return await handler(request, analyticsDeps())
  } catch {
    getDeps().log('analytics.ingest_error', { action: params.action })
    return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}

import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Database } from '../db/client'
import { analyticsSnapshots } from '../db/schema'
import { resolveAdmin } from '../lib/admin-auth'
import type { GatewayClient } from '../lib/gateway-client'
import { json } from '../lib/http'
import { analyticsPage } from './page-context'
import { analyticsHeatmap, analyticsReport } from './reports'

export interface AdminAnalyticsDeps {
  gateway: GatewayClient
  secure: boolean
  db: () => Database
  log: (message: string) => void
}
const Query = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  environment: z.enum(['production', 'development']).default('production'),
  funnel: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  campaign: z.string().max(100).optional(),
  page: z.string().max(220).optional(),
  revision: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  viewport: z.coerce.number().int().min(240).max(3840).optional(),
})
export async function adminAnalytics(request: Request, deps: AdminAnalyticsDeps) {
  const url = new URL(request.url)
  const auth = await resolveAdmin(request, deps.gateway, deps.secure)
  if (!auth) return json({ error: 'Sem acesso.' }, 401, { 'cache-control': 'no-store' })
  const respond = (body: unknown, status = 200) => {
    const response = json(body, status, { 'cache-control': 'no-store' })
    for (const cookie of auth.setCookies ?? []) response.headers.append('set-cookie', cookie)
    return response
  }
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return respond({ error: 'Filtros inválidos.' }, 400)
  const { viewport, ...query } = parsed.data
  if (viewport && (!query.page || !query.revision))
    return respond({ error: 'Informe página, versão e largura para consultar o mapa.' }, 400)
  const from = new Date(`${query.from}T00:00:00-03:00`)
  const to = new Date(`${query.to}T00:00:00-03:00`)
  to.setTime(to.getTime() + 86400000)
  if (
    to <= from ||
    to.getTime() - from.getTime() > 90 * 86400000 ||
    (query.page && !analyticsPage(query.page))
  )
    return respond({ error: 'Selecione até 90 dias e uma página válida.' }, 400)
  if (query.page) query.page = analyticsPage(query.page)!.path
  const filter = { ...query, from, to }
  let body: unknown
  try {
    if (viewport && query.page && query.revision) {
      const [snapshot] = await deps
        .db()
        .select()
        .from(analyticsSnapshots)
        .where(
          and(
            eq(analyticsSnapshots.page, query.page),
            eq(analyticsSnapshots.revision, query.revision),
            eq(analyticsSnapshots.viewport, viewport),
          ),
        )
        .limit(1)
      body = {
        snapshot: snapshot ?? null,
        points: await analyticsHeatmap(deps.db(), filter, viewport),
      }
    } else body = await analyticsReport(deps.db(), filter)
  } catch {
    deps.log('analytics.report_error')
    return respond({ error: 'Não foi possível consultar as métricas.' }, 503)
  }
  return respond(body)
}

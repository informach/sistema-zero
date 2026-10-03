import type { APIRoute } from 'astro'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { analyticsPage } from '../../../analytics/page-context'
import { analyticsHeatmap, analyticsReport } from '../../../analytics/reports'
import { getDb } from '../../../db/client'
import { analyticsSnapshots } from '../../../db/schema'
import { resolveAdmin } from '../../../lib/admin-auth'
import { json } from '../../../lib/http'
import { getDeps } from '../../../server/deps'

export const prerender = false
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
export const GET: APIRoute = async ({ request, url }) => {
  const { gateway, env } = getDeps()
  const auth = await resolveAdmin(request, gateway, env.NODE_ENV === 'production')
  if (!auth) return json({ error: 'Sem acesso.' }, 401)
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return json({ error: 'Filtros inválidos.' }, 400)
  const { viewport, ...query } = parsed.data
  const from = new Date(`${query.from}T00:00:00-03:00`)
  const to = new Date(`${query.to}T00:00:00-03:00`)
  to.setTime(to.getTime() + 86400000)
  if (
    to <= from ||
    to.getTime() - from.getTime() > 90 * 86400000 ||
    (query.page && !analyticsPage(query.page))
  )
    return json({ error: 'Selecione até 90 dias e uma página válida.' }, 400)
  const filter = { ...query, from, to }
  let body: unknown
  if (viewport && query.page && query.revision) {
    const [snapshot] = await getDb()
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
    body = { snapshot: snapshot ?? null, points: await analyticsHeatmap(getDb(), filter, viewport) }
  } else body = await analyticsReport(getDb(), filter)
  const response = json(body, 200, { 'cache-control': 'no-store' })
  for (const cookie of auth.setCookies ?? []) response.headers.append('set-cookie', cookie)
  return response
}

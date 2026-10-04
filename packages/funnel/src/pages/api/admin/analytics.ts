import type { APIRoute } from 'astro'
import { adminAnalytics } from '../../../analytics/admin'
import { getDb } from '../../../db/client'
import { getDeps } from '../../../server/deps'

export const prerender = false
export const GET: APIRoute = ({ request }) => {
  const { gateway, env, log } = getDeps()
  return adminAnalytics(request, { gateway, secure: env.NODE_ENV === 'production', db: getDb, log })
}

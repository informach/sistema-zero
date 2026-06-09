import type { APIRoute } from 'astro'
import { adminPerfis } from '../../../server/admin'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const GET: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return adminPerfis(request, { repo, gateway, secureCookie: env.NODE_ENV === 'production' })
}

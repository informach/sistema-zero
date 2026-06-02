import type { APIRoute } from 'astro'
import { adminLeads } from '../../../server/admin'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const GET: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return adminLeads(request, { repo, gateway, secureCookie: env.NODE_ENV === 'production' })
}

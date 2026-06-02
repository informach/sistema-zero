import type { APIRoute } from 'astro'
import { adminLogout } from '../../../server/admin'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return adminLogout(request, { repo, gateway, secureCookie: env.NODE_ENV === 'production' })
}

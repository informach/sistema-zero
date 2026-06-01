import type { APIRoute } from 'astro'
import { adminLogout } from '../../../server/admin'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return adminLogout(request, {
    repo,
    user: env.ADMIN_USER,
    password: env.ADMIN_PASSWORD,
    sessionSecret: env.ADMIN_SESSION_SECRET,
    secureCookie: env.NODE_ENV === 'production',
  })
}

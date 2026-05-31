import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { createLead, getLeadView, patchLead } from '../../../server/leads'

export const prerender = false

const leadDeps = () => {
  const { repo, env } = getDeps()
  return { repo, secureCookie: env.NODE_ENV === 'production' }
}

export const POST: APIRoute = ({ request }) => createLead(request, leadDeps())
export const GET: APIRoute = ({ request }) => getLeadView(request, leadDeps())
export const PATCH: APIRoute = ({ request }) => patchLead(request, leadDeps())

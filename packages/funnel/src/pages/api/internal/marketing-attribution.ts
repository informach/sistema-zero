import type { APIRoute } from 'astro'
import { commercialReport } from '../../../analytics/commercial-report'
import { getDb } from '../../../db/client'
import { getEnv } from '../../../lib/env'
import { handleCommercialReport } from '../../../server/commercial-report'
export const prerender = false
export const POST: APIRoute = ({ request }) =>
  handleCommercialReport(request, {
    internalToken: getEnv().FUNNEL_INTERNAL_TOKEN,
    report: (input) => commercialReport(getDb(), input),
  })

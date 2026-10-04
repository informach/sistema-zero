import { getDb } from '../db/client'
import { getDeps } from '../server/deps'
import { linkAnalyticsLead } from './handlers'
import { createAnalyticsRepo } from './repository'

let repo: ReturnType<typeof createAnalyticsRepo> | undefined
export function analyticsDeps() {
  const { env, repo: leads, log } = getDeps()
  if (!repo) {
    repo = createAnalyticsRepo(getDb())
    const prune = () => {
      void repo!.prune(new Date()).catch(() => log('analytics.retention_error'))
    }
    setTimeout(prune, 60000).unref()
    setInterval(prune, 6 * 3600000).unref()
  }
  return {
    repo,
    leads,
    secret: env.FUNNEL_HMAC_SECRET,
    secure: env.NODE_ENV === 'production',
    environment: env.NODE_ENV === 'production' ? ('production' as const) : ('development' as const),
  }
}

/** Optional measurement must never prevent saving contact or progressing through checkout. */
export async function tryLinkAnalytics(request: Request, leadId: string) {
  try {
    await linkAnalyticsLead(request, leadId, analyticsDeps())
  } catch {
    getDeps().log('analytics.link_error')
  }
}

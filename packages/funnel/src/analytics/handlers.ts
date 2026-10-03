import type { FunnelRepo } from '../db/repo'
import { getFunnelByKey } from '../funnels/registry'
import { json } from '../lib/http'
import { sanitizeLeadAttribution } from '../lib/lead-attribution'
import { getLeadId } from '../lib/lead-session'
import {
  analyticsCookie,
  clearVisitorCookie,
  isAnalyticsEnabled,
  sameOrigin,
  visitorCookie,
  visitorId,
} from './identity'
import { analyticsPage } from './page-context'
import { ANALYTICS_CLEANUP_COOKIE, ANALYTICS_PREFERENCE_COOKIE } from './preference'
import { analyticsJson, BootstrapBody, ConsentBody, EventBatch, UUID } from './protocol'
import { quizDefinition } from './quiz-definition'
import type { AnalyticsRepo, StoredAnalyticsEvent } from './repository'
import {
  ANALYTICS_PREFERENCE_DAYS,
  ANALYTICS_SESSION_MS,
  type AnalyticsEnvironment,
  type QuizDefinition,
} from './types'

export interface AnalyticsDeps {
  repo: AnalyticsRepo
  leads: FunnelRepo
  secret: string
  secure: boolean
  environment: AnalyticsEnvironment
  now?: () => Date
}
const reply = (body: unknown, status = 200, cookies: string[] = []) => {
  const response = json(body, status, { 'cache-control': 'no-store' })
  for (const cookie of cookies) response.headers.append('set-cookie', cookie)
  return response
}

export async function linkAnalyticsLead(request: Request, leadId: string, deps: AnalyticsDeps) {
  if (!isAnalyticsEnabled(request) || !UUID.safeParse(leadId).success) return
  const visitor = visitorId(request, deps.secret)
  if (!visitor) return
  const now = deps.now?.() ?? new Date()
  const session = await deps.repo.recentSession(visitor, deps.environment, now)
  if (session) await deps.repo.linkLead(session.id, leadId, now)
}

export async function analyticsConsent(request: Request, deps: AnalyticsDeps) {
  if (!sameOrigin(request)) return reply({ error: 'origin' }, 403)
  const parsed = ConsentBody.safeParse(await analyticsJson(request))
  if (!parsed.success) return reply({ error: 'payload' }, 400)
  const cookies = [
    analyticsCookie(
      ANALYTICS_PREFERENCE_COOKIE,
      parsed.data.choice,
      deps.secure,
      ANALYTICS_PREFERENCE_DAYS * 86400,
    ),
  ]
  if (parsed.data.choice === 'rejected') {
    const visitor = visitorId(request, deps.secret)
    if (visitor) await deps.repo.revoke(visitor)
    cookies.push(clearVisitorCookie(deps.secure))
    cookies.push(analyticsCookie(ANALYTICS_CLEANUP_COOKIE, '', deps.secure, 0))
  }
  return reply({ ok: true }, 200, cookies)
}

export async function analyticsSession(request: Request, deps: AnalyticsDeps) {
  if (!sameOrigin(request) || !isAnalyticsEnabled(request)) return reply({ error: 'disabled' }, 403)
  const parsed = BootstrapBody.safeParse(await analyticsJson(request))
  if (!parsed.success) return reply({ error: 'payload' }, 400)
  const page = analyticsPage(parsed.data.path)
  if (!page) return reply({ error: 'page' }, 400)
  const funnel = page.funnel ? getFunnelByKey(page.funnel) : null
  const definition = funnel ? quizDefinition(funnel) : null
  if (definition) await deps.repo.saveQuiz(definition)
  if (parsed.data.quizDefinitionId && parsed.data.quizDefinitionId !== definition?.id) {
    const archived = await deps.repo.quiz(parsed.data.quizDefinitionId)
    if (archived?.funnel !== page.funnel) return reply({ error: 'quiz_updated' }, 409)
  }
  const now = deps.now?.() ?? new Date()
  const session = await deps.repo.startSession({
    visitorId: visitorId(request, deps.secret),
    environment: deps.environment,
    path: page.path,
    attribution: sanitizeLeadAttribution(parsed.data.attribution),
    device: parsed.data.device,
    referrerHost: parsed.data.referrerHost ?? null,
    now,
  })
  const leadId = getLeadId(request)
  if (leadId && UUID.safeParse(leadId).success) {
    const lead = await deps.leads.getLead(leadId)
    if (lead && !lead.paidAt && lead.funnel === page.funnel)
      await deps.repo.linkLead(session.id, lead.id, now)
  }
  return reply(
    {
      sessionId: session.id,
      expiresAt: new Date(now.getTime() + ANALYTICS_SESSION_MS).toISOString(),
    },
    200,
    [visitorCookie(session.visitorId, deps.secret, deps.secure)],
  )
}

export async function analyticsIngest(request: Request, deps: AnalyticsDeps) {
  if (!sameOrigin(request) || !isAnalyticsEnabled(request)) return reply({ error: 'disabled' }, 403)
  const parsed = EventBatch.safeParse(await analyticsJson(request))
  if (!parsed.success) return reply({ error: 'payload' }, 400)
  const visitor = visitorId(request, deps.secret)
  const session = await deps.repo.session(parsed.data.sessionId)
  const now = deps.now?.() ?? new Date()
  if (
    !visitor ||
    !session ||
    session.visitorId !== visitor ||
    session.environment !== deps.environment ||
    now.getTime() - session.lastSeenAt.getTime() > ANALYTICS_SESSION_MS
  )
    return reply({ error: 'session' }, 401)
  const rows: StoredAnalyticsEvent[] = []
  const cookieLead = getLeadId(request)
  const definitions = new Map<string, QuizDefinition | null>()
  const attempts = new Map<string, boolean>()
  let observedCookieLead: Awaited<ReturnType<FunnelRepo['getLead']>> | undefined
  for (const event of parsed.data.events) {
    const page = analyticsPage(event.path)
    const at = new Date(event.at)
    if (
      !page ||
      at.getTime() > now.getTime() + 300000 ||
      at.getTime() < session.startedAt.getTime() - 300000
    )
      return reply({ error: 'event' }, 400)
    if (event.name === 'quiz_question_view') {
      const definitionId = event.quizDefinitionId || ''
      if (!definitions.has(definitionId))
        definitions.set(definitionId, definitionId ? await deps.repo.quiz(definitionId) : null)
      const definition = definitions.get(definitionId)
      if (
        definition?.funnel !== page.funnel ||
        !definition?.questions.some((q) => q.id === event.questionId)
      )
        return reply({ error: 'question' }, 400)
      if (!event.quizAttemptId) continue
      const attemptKey = `${event.quizAttemptId}:${definitionId}`
      if (!attempts.has(attemptKey)) {
        // The lead cookie is shared by tabs; switching products/restarting must not erase
        // queued views of an earlier attempt belonging to this same analytical visitor.
        const owned =
          event.quizAttemptId === cookieLead ||
          (await deps.repo.ownsLead(visitor, event.quizAttemptId, deps.environment))
        const attempt = owned ? await deps.leads.getLead(event.quizAttemptId) : null
        if (event.quizAttemptId === cookieLead) observedCookieLead = attempt
        attempts.set(attemptKey, attempt?.quizDefinitionId === definitionId)
      }
      if (!attempts.get(attemptKey)) continue
    }
    const { at: _, path: __, ...data } = event
    rows.push({
      ...data,
      sessionId: session.id,
      page: page.path,
      funnel: page.funnel,
      quizAttemptId: event.name === 'quiz_question_view' ? event.quizAttemptId : null,
      // No text or coordinates from quizzes, contact, checkout or personalized pages.
      label: page.publicText
        ? event.label?.replace(/\S+@\S+|\b\d[\d .()+-]{8,}\d\b/g, '[oculto]')
        : null,
      x: page.publicText && event.name === 'click' ? event.x : null,
      y: page.publicText && event.name === 'click' ? event.y : null,
      occurredAt: at,
      receivedAt: now,
    })
  }
  // Bootstrap and lead creation can run concurrently on a first visit. Recover
  // the association from the first authenticated page/question view after both
  // cookies exist; never associate another product or a completed purchase.
  const linkableViews = rows.filter(
    (row) => row.funnel && ['page_view', 'quiz_question_view'].includes(row.name),
  )
  if (cookieLead && UUID.safeParse(cookieLead).success && linkableViews.length) {
    try {
      const lead = observedCookieLead ?? (await deps.leads.getLead(cookieLead))
      if (lead && !lead.paidAt && linkableViews.some((row) => row.funnel === lead.funnel))
        await deps.repo.linkLead(session.id, lead.id, now)
    } catch {
      // Recovery is best effort (a concurrent deactivation may delete the session);
      // it must not cost the events of this batch.
    }
  }
  const inserted = await deps.repo.append(rows, now)
  return reply({ accepted: parsed.data.events.map((e) => e.id), inserted })
}

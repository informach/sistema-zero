import { describe, expect, test } from 'bun:test'
import {
  type AnalyticsDeps,
  analyticsConsent,
  analyticsIngest,
  analyticsSession,
} from '../../src/analytics/handlers'
import { visitorCookie, visitorId } from '../../src/analytics/identity'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import type {
  AnalyticsRepo,
  AnalyticsSession,
  StoredAnalyticsEvent,
} from '../../src/analytics/repository'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import { createLead, patchLead } from '../../src/server/leads'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

function fixture() {
  const now = new Date('2026-10-03T12:00:00Z')
  const session: AnalyticsSession = {
    id: crypto.randomUUID(),
    visitorId: crypto.randomUUID(),
    environment: 'development',
    entryPath: '/',
    device: 'mobile',
    attribution: null,
    referrerHost: null,
    startedAt: now,
    lastSeenAt: now,
  }
  const stored = new Map<string, StoredAnalyticsEvent>()
  let revoked = false
  let started = 0
  const repo: AnalyticsRepo = {
    async startSession() {
      started++
      return session
    },
    async session() {
      return revoked ? null : session
    },
    async recentSession() {
      return session
    },
    async append(events) {
      let count = 0
      for (const event of events)
        if (!stored.has(event.id)) {
          stored.set(event.id, event)
          count++
        }
      return count
    },
    async revoke() {
      revoked = true
      stored.clear()
    },
    async linkLead() {},
    async saveQuiz() {},
    async quiz() {
      return null
    },
    async prune() {},
  }
  const deps: AnalyticsDeps = {
    repo,
    leads: createFakeRepo().repo,
    secret: 'test-only-secret',
    secure: false,
    environment: 'development',
    now: () => now,
  }
  const cookie = `sz_metrics=accepted; ${visitorCookie(session.visitorId, deps.secret, false).split(';')[0]}`
  const request = (body: unknown, cookies = cookie, origin = 'http://localhost:4321') =>
    new Request('http://localhost:4321/api/analytics/events', {
      method: 'POST',
      headers: { origin, cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  const event = {
    id: crypto.randomUUID(),
    pageViewId: crypto.randomUUID(),
    name: 'click',
    path: '/',
    revision: 'a'.repeat(64),
    at: now.toISOString(),
    elementId: 'bio-comunidade',
    label: 'Conhecer a Comunidade',
    viewport: 390,
    x: 5000,
    y: 5000,
  }
  return { deps, session, stored, request, event, started: () => started }
}
describe('coleta com consentimento', () => {
  test('não cria sessão sem aceite; bloqueia outra origem e assinatura adulterada', async () => {
    const f = fixture()
    expect(
      (await analyticsSession(f.request({ path: '/', device: 'mobile' }, ''), f.deps)).status,
    ).toBe(403)
    expect(f.started()).toBe(0)
    expect(
      (
        await analyticsSession(
          f.request({ path: '/', device: 'mobile' }, undefined, 'https://outro.test'),
          f.deps,
        )
      ).status,
    ).toBe(403)
    const signed = visitorCookie(f.session.visitorId, f.deps.secret, false).split(';')[0]!
    expect(visitorId(f.request({}, `sz_metrics=accepted; ${signed}0`), f.deps.secret)).toBeNull()
  })
  test('tentativas repetidas não duplicam eventos e revogação apaga a coleta', async () => {
    const f = fixture()
    const body = { sessionId: f.session.id, events: [f.event] }
    expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(200)
    expect(await (await analyticsIngest(f.request(body), f.deps)).json()).toMatchObject({
      inserted: 0,
    })
    expect(f.stored.size).toBe(1)
    expect((await analyticsConsent(f.request({ choice: 'rejected' }), f.deps)).status).toBe(200)
    expect(f.stored.size).toBe(0)
    expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(401)
  })
  test('checkout descarta texto e coordenadas; protocolo recusa pagamento forjado e dados livres', async () => {
    const f = fixture()
    const body = {
      sessionId: f.session.id,
      events: [
        {
          ...f.event,
          path: '/kids/comunidade-dos-criadores/checkout',
          label: 'Pessoa pessoa@example.test',
        },
      ],
    }
    expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(200)
    expect(f.stored.get(f.event.id)).toMatchObject({ label: null, x: null, y: null })
    expect(
      (
        await analyticsIngest(
          f.request({ ...body, events: [{ ...f.event, name: 'payment_approved' }] }),
          f.deps,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await analyticsIngest(
          f.request({ ...body, events: [{ ...f.event, value: 'segredo' }] }),
          f.deps,
        )
      ).status,
    ).toBe(400)
  })
  test('sessão de outra pessoa e evento fora da janela são recusados', async () => {
    const f = fixture()
    const other = visitorCookie(crypto.randomUUID(), f.deps.secret, false).split(';')[0]
    expect(
      (
        await analyticsIngest(
          f.request(
            { sessionId: f.session.id, events: [f.event] },
            `sz_metrics=accepted; ${other}`,
          ),
          f.deps,
        )
      ).status,
    ).toBe(401)
    expect(
      (
        await analyticsIngest(
          f.request({
            sessionId: f.session.id,
            events: [{ ...f.event, at: '2027-01-01T00:00:00Z' }],
          }),
          f.deps,
        )
      ).status,
    ).toBe(400)
  })
})
test('quiz arquiva versão antes da criação e impede aba antiga de alterar respostas', async () => {
  const { repo, leads, events } = createFakeRepo()
  const definition = quizDefinition(COMUNIDADE_DOS_CRIADORES)!
  let archived = ''
  const deps = {
    repo,
    secureCookie: false,
    saveQuizDefinition: async (value: typeof definition) => {
      archived = value.id
    },
  }
  const request = (body: unknown, cookie = '') =>
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  const response = await createLead(
    request({ funnel: definition.funnel, quizDefinitionId: definition.id }),
    deps,
  )
  const { id } = (await response.json()) as { id: string }
  expect(archived).toBe(definition.id)
  expect(leads.get(id)?.quizDefinitionId).toBe(definition.id)
  expect(
    (
      await patchLead(
        request(
          {
            key: 'q1',
            value: '9_a_11',
            quizDefinitionId: definition.id,
            funnel: definition.funnel,
            revision: 0,
            sessionToken: quizSessionToken(id),
          },
          `funil_lead=${id}`,
        ),
        deps,
      )
    ).status,
  ).toBe(200)
  expect(events.find((e) => e.eventName === 'quiz_answer_saved')?.metadata).toMatchObject({
    question_id: 'q1',
    quiz_definition_id: definition.id,
  })
  await repo.updateLead(id, { quizDefinitionId: 'b'.repeat(64), quizAnswers: { q1: '9_10' } })
  expect(
    (
      await patchLead(
        request({ key: 'q1', value: '11_12', quizDefinitionId: definition.id }, `funil_lead=${id}`),
        deps,
      )
    ).status,
  ).toBe(409)
  expect(leads.get(id)?.quizAnswers).toEqual({ q1: '9_10' })
  expect(
    (
      await createLead(
        request({ funnel: definition.funnel, quizDefinitionId: 'b'.repeat(64) }),
        deps,
      )
    ).status,
  ).toBe(409)
})

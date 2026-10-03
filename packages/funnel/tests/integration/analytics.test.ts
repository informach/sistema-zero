import { describe, expect, test } from 'bun:test'
import {
  type AnalyticsDeps,
  analyticsConsent,
  analyticsIngest,
  analyticsSession,
  linkAnalyticsLead,
} from '../../src/analytics/handlers'
import { visitorCookie, visitorId } from '../../src/analytics/identity'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import type {
  AnalyticsRepo,
  AnalyticsSession,
  StoredAnalyticsEvent,
} from '../../src/analytics/repository'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import { createLead, patchLead, saveContact } from '../../src/server/leads'
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
    async ownsLead() {
      return false
    },
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
  const cookie = visitorCookie(session.visitorId, deps.secret, false).split(';')[0]!
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
describe('coleta automática com preferência de desativação', () => {
  test('cria sessão sem preferência e sem fabricar aceite; bloqueia desativação, outra origem e assinatura adulterada', async () => {
    const f = fixture()
    const response = await analyticsSession(f.request({ path: '/', device: 'mobile' }, ''), f.deps)
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('sz_visitor=')
    expect(response.headers.get('set-cookie')).not.toContain('sz_metrics=accepted')
    expect(f.started()).toBe(1)
    expect(
      (
        await analyticsSession(
          f.request({ path: '/', device: 'mobile' }, 'sz_metrics=rejected'),
          f.deps,
        )
      ).status,
    ).toBe(403)
    expect(f.started()).toBe(1)
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
  test('liga o contato à navegação anterior sem aceite e respeita desativação no servidor', async () => {
    const f = fixture()
    const { repo, leads } = createFakeRepo()
    const created = await repo.createLead('kids/comunidade-dos-criadores')
    const id = crypto.randomUUID()
    leads.set(id, { ...leads.get(created.id)!, id })
    leads.delete(created.id)
    const links: Array<{ sessionId: string; leadId: string }> = []
    f.deps.repo.linkLead = async (sessionId, leadId) => {
      links.push({ sessionId, leadId })
    }
    const cookie = `${visitorCookie(f.session.visitorId, f.deps.secret, false).split(';')[0]}; funil_lead=${id}`
    const response = await saveContact(
      f.request({ nome: 'Pessoa QA', email: 'qa@example.test', telefone: '31999999999' }, cookie),
      {
        repo,
        secureCookie: false,
        linkAnalytics: (request, leadId) => linkAnalyticsLead(request, leadId, f.deps),
      },
    )
    expect(response.status).toBe(200)
    expect(leads.get(id)?.email).toBe('qa@example.test')
    expect(links).toEqual([{ sessionId: f.session.id, leadId: id }])
    await linkAnalyticsLead(f.request({}, `${cookie}; sz_metrics=rejected`), id, f.deps)
    expect(links).toHaveLength(1)
    expect(
      (
        await analyticsIngest(
          f.request(
            { sessionId: f.session.id, events: [f.event] },
            `${cookie}; sz_metrics=rejected`,
          ),
          f.deps,
        )
      ).status,
    ).toBe(403)
    expect(f.stored.size).toBe(0)
  })
  test('tentativas repetidas não duplicam eventos e revogação apaga a coleta', async () => {
    const f = fixture()
    const body = { sessionId: f.session.id, events: [f.event] }
    expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(200)
    expect(await (await analyticsIngest(f.request(body), f.deps)).json()).toMatchObject({
      inserted: 0,
    })
    expect(f.stored.size).toBe(1)
    const rejected = await analyticsConsent(f.request({ choice: 'rejected' }), f.deps)
    expect(rejected.status).toBe(200)
    expect(f.stored.size).toBe(0)
    expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(401)
    // A coleta é automática: a desativação dura mais que o identificador de 30 dias.
    const setCookies = rejected.headers.getSetCookie()
    const preference = setCookies.find((c) => c.startsWith('sz_metrics=rejected'))
    expect(preference).toContain(`Max-Age=${365 * 86400}`)
    // O identificador e o marcador de exclusão pendente saem do navegador.
    expect(setCookies.find((c) => c.startsWith('sz_visitor='))).toContain('Max-Age=0')
    expect(setCookies.find((c) => c.startsWith('sz_metrics_cleanup='))).toContain('Max-Age=0')
  })
  test('desativar sem identificador responde ok, não apaga nada e encerra a pendência', async () => {
    const f = fixture()
    let revokes = 0
    f.deps.repo.revoke = async () => {
      revokes++
    }
    const response = await analyticsConsent(
      f.request({ choice: 'rejected' }, 'sz_metrics=rejected; sz_metrics_cleanup=1'),
      f.deps,
    )
    expect(response.status).toBe(200)
    expect(revokes).toBe(0)
    expect(
      response.headers.getSetCookie().find((c) => c.startsWith('sz_metrics_cleanup=')),
    ).toContain('Max-Age=0')
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
test('respostas de outra aba mantêm a tentativa vinculada ao visitante, sem aceitar a de terceiros', async () => {
  const f = fixture()
  const definition = quizDefinition(COMUNIDADE_DOS_CRIADORES)!
  const attempt = crypto.randomUUID()
  f.deps.repo.quiz = async () => definition
  const original = await f.deps.leads.createLead(definition.funnel, null, definition.id)
  const lead = await f.deps.leads.getLead(original.id)
  f.deps.leads.getLead = async (id) => (id === attempt ? { ...lead!, id: attempt } : null)
  f.deps.repo.ownsLead = async (visitor, id) => visitor === f.session.visitorId && id === attempt
  const body = {
    sessionId: f.session.id,
    events: [
      {
        ...f.event,
        name: 'quiz_question_view',
        path: '/kids/comunidade-dos-criadores/quiz',
        quizDefinitionId: definition.id,
        quizAttemptId: attempt,
        questionId: 'q1',
      },
    ],
  }
  expect((await analyticsIngest(f.request(body), f.deps)).status).toBe(200)
  expect(f.stored.size).toBe(1)
  f.deps.repo.ownsLead = async () => false
  body.events[0]!.id = crypto.randomUUID()
  await analyticsIngest(f.request(body), f.deps)
  expect(f.stored.size).toBe(1)
})

test('primeiro lote recupera vínculo quando o lead nasceu antes do cookie analítico', async () => {
  const f = fixture()
  const definition = quizDefinition(COMUNIDADE_DOS_CRIADORES)!
  const attempt = crypto.randomUUID()
  const original = await f.deps.leads.createLead(definition.funnel, null, definition.id)
  const lead = await f.deps.leads.getLead(original.id)
  f.deps.leads.getLead = async (id) => (id === attempt ? { ...lead!, id: attempt } : null)
  f.deps.repo.quiz = async () => definition
  const links: string[] = []
  f.deps.repo.linkLead = async (_session, id) => {
    links.push(id)
  }
  await analyticsSession(
    f.request({ path: '/kids/comunidade-dos-criadores/quiz', device: 'mobile' }, ''),
    f.deps,
  )
  expect(links).toHaveLength(0)
  const body = {
    sessionId: f.session.id,
    events: [
      {
        ...f.event,
        name: 'quiz_question_view',
        path: '/kids/comunidade-dos-criadores/quiz',
        quizDefinitionId: definition.id,
        quizAttemptId: attempt,
        questionId: 'q1',
      },
    ],
  }
  const cookie = `${visitorCookie(f.session.visitorId, f.deps.secret, false).split(';')[0]}; funil_lead=${attempt}`
  expect((await analyticsIngest(f.request(body, cookie), f.deps)).status).toBe(200)
  expect(links).toEqual([attempt])
  links.length = 0
  const pageBody = {
    sessionId: f.session.id,
    events: [
      {
        ...f.event,
        id: crypto.randomUUID(),
        name: 'page_view',
        path: '/kids/comunidade-dos-criadores/oferta',
      },
    ],
  }
  expect((await analyticsIngest(f.request(pageBody, cookie), f.deps)).status).toBe(200)
  expect(links).toEqual([attempt])
  links.length = 0
  // A lead from another product must not absorb this visit, even in a mixed batch.
  pageBody.events[0]!.path = '/kids/desafio-primeiro-jogo/oferta'
  pageBody.events.push({
    ...pageBody.events[0]!,
    id: crypto.randomUUID(),
    name: 'click',
    path: '/kids/comunidade-dos-criadores/oferta',
  })
  expect((await analyticsIngest(f.request(pageBody, cookie), f.deps)).status).toBe(200)
  expect(links).toHaveLength(0)
  f.deps.leads.getLead = async () => ({ ...lead!, id: attempt, paidAt: f.session.startedAt })
  expect((await analyticsIngest(f.request(body, cookie), f.deps)).status).toBe(200)
  expect(links).toHaveLength(0)
  // Compra concluída também pelo caminho da página vista (lead lido do cookie).
  const paidPage = {
    sessionId: f.session.id,
    events: [
      {
        ...f.event,
        id: crypto.randomUUID(),
        name: 'page_view',
        path: '/kids/comunidade-dos-criadores/oferta',
      },
    ],
  }
  expect((await analyticsIngest(f.request(paidPage, cookie), f.deps)).status).toBe(200)
  expect(links).toHaveLength(0)
  // Falha no vínculo recuperado não custa os eventos do lote.
  f.deps.leads.getLead = async () => ({ ...lead!, id: attempt })
  f.deps.repo.linkLead = async () => {
    throw new Error('sessão apagada por uma desativação concorrente')
  }
  paidPage.events[0]!.id = crypto.randomUUID()
  const kept = await analyticsIngest(f.request(paidPage, cookie), f.deps)
  expect(kept.status).toBe(200)
  expect(await kept.json()).toMatchObject({ inserted: 1 })
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

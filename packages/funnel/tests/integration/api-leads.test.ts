import { describe, expect, test } from 'bun:test'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { createLead, getLeadView, patchLead, recordEvent } from '../../src/server/leads'
import { createFakeRepo } from '../fakes/fake-db'

const deps = (repo: ReturnType<typeof createFakeRepo>['repo']) => ({ repo, secureCookie: false })

function req(method: string, body?: unknown, cookie?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/leads', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const cookieFor = (id: string) => `${LEAD_COOKIE}=${id}`

describe('POST /api/leads', () => {
  test('cria lead, seta cookie e registra entrou_landing', async () => {
    const { repo, leads, events } = createFakeRepo()
    const res = await createLead(req('POST'), deps(repo))
    expect(res.status).toBe(201)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${LEAD_COOKIE}=`)
    expect(setCookie).toContain('HttpOnly')
    const { id } = (await res.json()) as { id: string }
    expect(leads.has(id)).toBe(true)
    expect(events).toEqual([{ leadId: id, eventName: 'entrou_landing', step: 'landing' }])
  })

  test('idempotente quando o cookie já aponta para um lead existente', async () => {
    const { repo } = createFakeRepo()
    const first = await createLead(req('POST'), deps(repo))
    const { id } = (await first.json()) as { id: string }
    const again = await createLead(req('POST', undefined, cookieFor(id)), deps(repo))
    expect(again.status).toBe(200)
    expect(((await again.json()) as { id: string }).id).toBe(id)
    expect(await repo.countLeads()).toBe(1)
  })
})

describe('PATCH /api/leads (lead do cookie)', () => {
  test('salva segmento e registra evento', async () => {
    const { repo, leads, events } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await patchLead(
      req(
        'PATCH',
        {
          key: 'segmento',
          value: 'B',
          lastStep: 'quiz_pergunta_1',
          eventName: 'respondeu_pergunta_1',
        },
        cookieFor(id),
      ),
      deps(repo),
    )
    expect(res.status).toBe(200)
    expect(leads.get(id)?.segmento).toBe('B')
    expect(leads.get(id)?.lastStep).toBe('quiz_pergunta_1')
    expect(events.some((e) => e.eventName === 'respondeu_pergunta_1')).toBe(true)
  })

  test('401 quando não há cookie de lead', async () => {
    const { repo } = createFakeRepo()
    const res = await patchLead(req('PATCH', { key: 'segmento', value: 'A' }), deps(repo))
    expect(res.status).toBe(401)
  })

  test('recalcula custo_mensal quando horas e valor_hora chegam (em centavos)', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead()
    await patchLead(req('PATCH', { key: 'horas_retrabalho', value: 10 }, cookieFor(id)), deps(repo))
    await patchLead(req('PATCH', { key: 'valor_hora', value: 5000 }, cookieFor(id)), deps(repo))
    // 10 horas * R$50,00 (5000 centavos) * 4 = R$2.000,00 = 200000 centavos
    expect(leads.get(id)?.custoMensal).toBe(200000)
  })

  test('rejeita número negativo', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await patchLead(
      req('PATCH', { key: 'gasto_terceiros', value: -5 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })

  test('rejeita escolha fora de A-D', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await patchLead(
      req('PATCH', { key: 'segmento', value: 'X' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.segmento).toBeNull()
  })

  test('rejeita numérico acima do limite (anti-overflow int4)', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await patchLead(
      req('PATCH', { key: 'valor_hora', value: 9_999_999_999 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })

  test('rejeita nivel_refem fora de 1..10', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await patchLead(
      req('PATCH', { key: 'nivel_refem', value: 11 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /api/leads', () => {
  test('retorna respostas e lastStep do lead do cookie', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead()
    await patchLead(
      req('PATCH', { key: 'segmento', value: 'C', lastStep: 'quiz_pergunta_1' }, cookieFor(id)),
      deps(repo),
    )
    const res = await getLeadView(req('GET', undefined, cookieFor(id)), deps(repo))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { lastStep: string; answers: Record<string, unknown> }
    expect(body.lastStep).toBe('quiz_pergunta_1')
    expect(body.answers.segmento).toBe('C')
  })

  test('401 sem cookie', async () => {
    const { repo } = createFakeRepo()
    const res = await getLeadView(req('GET'), deps(repo))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/events', () => {
  test('registra evento para o lead do cookie', async () => {
    const { repo, events } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await recordEvent(
      req('POST', { eventName: 'viu_pagina_vendas' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(201)
    expect(events.some((e) => e.eventName === 'viu_pagina_vendas')).toBe(true)
  })

  test('401 sem cookie de lead', async () => {
    const { repo } = createFakeRepo()
    const res = await recordEvent(req('POST', { eventName: 'x' }), deps(repo))
    expect(res.status).toBe(401)
  })
})

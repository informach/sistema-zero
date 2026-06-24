import { describe, expect, test } from 'bun:test'
import { DEFAULT_FUNNEL } from '../../src/funnels/registry'
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
    expect(events).toEqual([
      { leadId: id, eventName: 'entrou_landing', step: 'landing', metadata: null },
    ])
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

  test('cria novo lead quando o cookie pertence a outro funil', async () => {
    const { repo, leads } = createFakeRepo()
    const old = await repo.createLead('kids/outro-produto')
    const res = await createLead(
      req('POST', { funnel: DEFAULT_FUNNEL.key }, cookieFor(old.id)),
      deps(repo),
    )
    expect(res.status).toBe(201)
    const { id } = (await res.json()) as { id: string }
    expect(id).not.toBe(old.id)
    expect(leads.get(id)?.funnel).toBe(DEFAULT_FUNNEL.key)
    expect(await repo.countLeads()).toBe(2)
    expect(res.headers.get('set-cookie')).toContain(`${LEAD_COOKIE}=${id}`)
  })

  test('lead legado sem funnel é reaproveitado no funil default', async () => {
    const { repo } = createFakeRepo()
    const legacy = await repo.createLead()
    const res = await createLead(
      req('POST', { funnel: DEFAULT_FUNNEL.key }, cookieFor(legacy.id)),
      deps(repo),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { id: string }).id).toBe(legacy.id)
    expect(await repo.countLeads()).toBe(1)
  })

  test('cookie de lead malformado é tratado como sessão ausente', async () => {
    const { repo } = createFakeRepo()
    const res = await createLead(req('POST', undefined, `${LEAD_COOKIE}=%`), deps(repo))
    expect(res.status).toBe(201)
    expect(await repo.countLeads()).toBe(1)
  })

  test('grava o funil de origem (validado pelo registry) na criação', async () => {
    const { repo, leads } = createFakeRepo()
    const res = await createLead(req('POST', { funnel: DEFAULT_FUNNEL.key }), deps(repo))
    const { id } = (await res.json()) as { id: string }
    expect(leads.get(id)?.funnel).toBe(DEFAULT_FUNNEL.key)
  })

  test('funil desconhecido no corpo é ignorado (funnel = null)', async () => {
    const { repo, leads } = createFakeRepo()
    const res = await createLead(req('POST', { funnel: 'pro/produto-inexistente' }), deps(repo))
    const { id } = (await res.json()) as { id: string }
    expect(leads.get(id)?.funnel).toBeNull()
  })
})

describe('POST /api/events (whitelist de eventos do cliente)', () => {
  test('evento fora do whitelist (ex.: pagamento_confirmado) → 400, nada gravado', async () => {
    const { repo, events } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await recordEvent(
      new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookieFor(id) },
        body: JSON.stringify({ eventName: 'pagamento_confirmado' }),
      }),
      deps(repo),
    )
    // Marcos server-side NÃO são forjáveis pelo cliente (inflariam a conversão).
    expect(res.status).toBe(400)
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(0)
  })

  test('evento do whitelist (viu_pagina_vendas) → 201', async () => {
    const { repo, events } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await recordEvent(
      new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookieFor(id) },
        body: JSON.stringify({ eventName: 'viu_pagina_vendas' }),
      }),
      deps(repo),
    )
    expect(res.status).toBe(201)
    expect(events.some((e) => e.eventName === 'viu_pagina_vendas')).toBe(true)
  })
})

describe('PATCH /api/leads (lead do cookie)', () => {
  test('salva a resposta em quiz_answers e registra o evento do passo', async () => {
    const { repo, leads, events } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
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
    expect(leads.get(id)?.quizAnswers?.segmento).toBe('B')
    expect(leads.get(id)?.lastStep).toBe('quiz_pergunta_1')
    expect(events.some((e) => e.eventName === 'respondeu_pergunta_1')).toBe(true)
  })

  test('401 quando não há cookie de lead', async () => {
    const { repo } = createFakeRepo()
    const res = await patchLead(req('PATCH', { key: 'segmento', value: 'A' }), deps(repo))
    expect(res.status).toBe(401)
  })

  test('lead sem funil (sem quiz) → 400', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead() // sem funnel → não resolve quiz
    const res = await patchLead(
      req('PATCH', { key: 'segmento', value: 'A' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })

  test('rejeita chave fora do quiz do funil', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'idade_da_crianca', value: '7' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers).toBeNull()
  })

  test('rejeita eventName que não é passo da resposta sem persistir nada', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req(
        'PATCH',
        {
          key: 'segmento',
          value: 'A',
          lastStep: 'pagamento_confirmado',
          eventName: 'pagamento_confirmado',
        },
        cookieFor(id),
      ),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers).toBeNull()
    expect(leads.get(id)?.lastStep).toBe('entrou_landing')
  })

  test('rejeita lastStep que não pertence à pergunta', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'segmento', value: 'A', lastStep: 'quiz_pergunta_10' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers).toBeNull()
  })

  test('o funil deriva custo_mensal quando horas e valor_hora chegam (centavos)', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    await patchLead(req('PATCH', { key: 'horas_retrabalho', value: 10 }, cookieFor(id)), deps(repo))
    await patchLead(req('PATCH', { key: 'valor_hora', value: 5000 }, cookieFor(id)), deps(repo))
    // 10 horas * R$50,00 (5000 centavos) * 4 = R$2.000,00 = 200000 centavos
    expect(leads.get(id)?.quizAnswers?.custo_mensal).toBe(200000)
  })

  test('rejeita número negativo', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'horas_retrabalho', value: -5 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })

  test('rejeita escolha fora de A-D', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'segmento', value: 'X' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers?.segmento).toBeUndefined()
  })

  test('aceita a 5ª opção (E) nas perguntas de 5 opções (tipo_criar/custo_principal)', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const ok = await patchLead(
      req('PATCH', { key: 'tipo_criar', value: 'E' }, cookieFor(id)),
      deps(repo),
    )
    expect(ok.status).toBe(200)
    expect(leads.get(id)?.quizAnswers?.tipo_criar).toBe('E')
    // ja_quebrou agora é A-D (deixou de ser sim/não): 'sim' é inválido.
    const bad = await patchLead(
      req('PATCH', { key: 'ja_quebrou', value: 'sim' }, cookieFor(id)),
      deps(repo),
    )
    expect(bad.status).toBe(400)
  })

  test('rejeita numérico acima do limite (anti-overflow int4)', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'valor_hora', value: 9_999_999_999 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /api/leads', () => {
  test('retorna respostas e lastStep do lead do cookie', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
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

  test('401 com cookie de lead malformado', async () => {
    const { repo } = createFakeRepo()
    const res = await getLeadView(req('GET', undefined, `${LEAD_COOKIE}=%`), deps(repo))
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

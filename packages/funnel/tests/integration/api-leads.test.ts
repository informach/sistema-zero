import { describe, expect, test } from 'bun:test'
import { DEFAULT_FUNNEL } from '../../src/funnels/registry'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { createLead, getLeadView, patchLead, recordEvent } from '../../src/server/leads'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

const deps = (repo: ReturnType<typeof createFakeRepo>['repo']) => ({ repo, secureCookie: false })

function req(method: string, body?: unknown, cookie?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/leads', {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : JSON.stringify(
            method === 'PATCH' && cookie
              ? {
                  funnel: DEFAULT_FUNNEL.key,
                  revision: 0,
                  sessionToken: quizSessionToken(cookie.slice(LEAD_COOKIE.length + 1)),
                  ...(body as Record<string, unknown>),
                }
              : body,
          ),
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
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({
      leadId: id,
      eventName: 'entrou_landing',
      step: 'landing',
      metadata: {},
    })
    expect(events[1]).toMatchObject({
      leadId: id,
      eventName: 'view_landing',
      step: 'landing',
    })
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

  test('sanitiza a atribuição e não aceita PII em parâmetros técnicos', async () => {
    const { repo, leads } = createFakeRepo()
    const res = await createLead(
      req('POST', {
        funnel: DEFAULT_FUNNEL.key,
        attribution: {
          utmSource: 'escola-centro',
          utmMedium: 'qr',
          utmCampaign: 'evento_setembro',
          utmContent: 'ana@example.com',
          eventCode: 'ESCOLA_2026_09',
          initialCouponCode: 'evento37',
          landingPath: '/kids/desafio-primeiro-jogo/oferta?cpf=123',
        },
      }),
      deps(repo),
    )
    const { id } = (await res.json()) as { id: string }
    expect(leads.get(id)?.attribution).toEqual({
      version: 1,
      utmSource: 'escola-centro',
      utmMedium: 'qr',
      utmCampaign: 'evento_setembro',
      utmContent: null,
      eventCode: 'ESCOLA_2026_09',
      initialCouponCode: 'EVENTO37',
      landingPath: '/kids/desafio-primeiro-jogo/oferta',
    })
  })

  test('first-touch não é sobrescrito ao reaproveitar o lead', async () => {
    const { repo, leads } = createFakeRepo()
    const first = await createLead(
      req('POST', {
        funnel: DEFAULT_FUNNEL.key,
        attribution: { eventCode: 'PRIMEIRO', landingPath: '/quiz' },
      }),
      deps(repo),
    )
    const { id } = (await first.json()) as { id: string }
    await createLead(
      req(
        'POST',
        { funnel: DEFAULT_FUNNEL.key, attribution: { eventCode: 'SEGUNDO' } },
        cookieFor(id),
      ),
      deps(repo),
    )
    expect(leads.get(id)?.attribution?.eventCode).toBe('PRIMEIRO')
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

  test('métricas desativadas (sz_metrics=rejected) → 202 sem gravar o comportamento', async () => {
    const { repo, events } = createFakeRepo()
    const { id } = await repo.createLead()
    const res = await recordEvent(
      new Request('http://localhost/api/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${cookieFor(id)}; sz_metrics=rejected`,
        },
        body: JSON.stringify({ eventName: 'abriu_checkout' }),
      }),
      deps(repo),
    )
    expect(res.status).toBe(202)
    expect(events.some((e) => e.eventName === 'abriu_checkout')).toBe(false)
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
          key: 'tempo_jogo',
          value: '3_7',
          lastStep: 'comunidade_adulto_v1_tempo_jogo',
          eventName: 'respondeu_comunidade_adulto_v1_tempo_jogo',
        },
        cookieFor(id),
      ),
      deps(repo),
    )
    expect(res.status).toBe(200)
    expect(leads.get(id)?.quizAnswers?.tempo_jogo).toBe('3_7')
    expect(leads.get(id)?.lastStep).toBe('comunidade_adulto_v1_tempo_jogo')
    expect(events.some((e) => e.eventName === 'respondeu_comunidade_adulto_v1_tempo_jogo')).toBe(
      true,
    )
  })

  test('401 quando não há cookie de lead', async () => {
    const { repo } = createFakeRepo()
    const res = await patchLead(req('PATCH', { key: 'tempo_jogo', value: 'A' }), deps(repo))
    expect(res.status).toBe(401)
  })

  test('lead sem funil (sem quiz) → 400', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead() // sem funnel → não resolve quiz
    const res = await patchLead(
      req('PATCH', { key: 'tempo_jogo', value: 'A' }, cookieFor(id)),
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
          key: 'tempo_jogo',
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
      req(
        'PATCH',
        { key: 'tempo_jogo', value: 'A', lastStep: 'comunidade_adulto_v1_tempo_jogo0' },
        cookieFor(id),
      ),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers).toBeNull()
  })

  test('quiz retirado não aceita novas respostas', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead('pro/no-comando-da-ia')
    const before = JSON.stringify(leads.get(id))
    const response = await patchLead(
      req('PATCH', { funnel: 'pro/no-comando-da-ia', key: 'segmento', value: 'A' }, cookieFor(id)),
      deps(repo),
    )
    expect(response.status).toBe(400)
    expect(JSON.stringify(leads.get(id))).toBe(before)
  })

  test('rejeita número negativo', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'tempo_jogo', value: -5 }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
  })

  test('rejeita escolha ausente no quiz', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'tempo_jogo', value: 'X' }, cookieFor(id)),
      deps(repo),
    )
    expect(res.status).toBe(400)
    expect(leads.get(id)?.quizAnswers?.tempo_jogo).toBeUndefined()
  })

  test('aceita uma opção publicada e recusa um valor fora das opções sem alterar a resposta', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    expect(
      (
        await patchLead(
          req('PATCH', { key: 'tempo_jogo', value: 'mais_14' }, cookieFor(id)),
          deps(repo),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await patchLead(
          req('PATCH', { key: 'tempo_jogo', value: 'invalido' }, cookieFor(id)),
          deps(repo),
        )
      ).status,
    ).toBe(400)
    expect(leads.get(id)?.quizAnswers?.tempo_jogo).toBe('mais_14')
  })

  test('rejeita número no campo de escolha', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead(DEFAULT_FUNNEL.key)
    const res = await patchLead(
      req('PATCH', { key: 'tempo_jogo', value: 9_999_999_999 }, cookieFor(id)),
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
      req(
        'PATCH',
        { key: 'tempo_jogo', value: '7_14', lastStep: 'comunidade_adulto_v1_tempo_jogo' },
        cookieFor(id),
      ),
      deps(repo),
    )
    const res = await getLeadView(req('GET', undefined, cookieFor(id)), deps(repo))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { lastStep: string; answers: Record<string, unknown> }
    expect(body.lastStep).toBe('comunidade_adulto_v1_tempo_jogo')
    expect(body.answers.tempo_jogo).toBe('7_14')
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

import { describe, expect, test } from 'bun:test'
import type { QuizDefinition } from '../../src/analytics/types'
import { profileLabels } from '../../src/funnels/kids-vida/engine'
import { DEFAULT_FUNNEL } from '../../src/funnels/registry'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '../../src/lib/admin-auth'
import {
  adminFunnel,
  adminLeads,
  adminLogin,
  adminLogout,
  adminPerfis,
} from '../../src/server/admin'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway, type FakeGatewayState } from '../fakes/fake-gateway'

function setup() {
  const { repo, quizVersions } = createFakeRepo()
  const fg = createFakeGateway()
  const definitions = new Map<string, QuizDefinition>()
  const deps = {
    repo,
    gateway: fg.gateway,
    secureCookie: false,
    quizDefinitions: { quiz: async (id: string) => definitions.get(id) ?? null },
  }
  return { repo, fg, deps, quizVersions, definitions }
}

function loginReq(body?: unknown): Request {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
function getReq(cookie?: string): Request {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/admin', { headers })
}
/** Cookie de sessão válido (access token do auth falso). */
const accessCookie = (fg: FakeGatewayState) => `${ADMIN_ACCESS_COOKIE}=${fg.auth.access}`
/** GET /api/admin/leads com query string (ex.: `?limit=25&offset=25`). */
const leadsReq = (fg: FakeGatewayState, query = ''): Request =>
  new Request(`http://localhost/api/admin/leads${query}`, { headers: { cookie: accessCookie(fg) } })

describe('adminLogin', () => {
  test('200 e seta cookies access+refresh (HttpOnly) com credenciais de admin', async () => {
    const { fg, deps } = setup()
    const res = await adminLogin(
      loginReq({ email: fg.auth.email, password: fg.auth.password }),
      deps,
    )
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.startsWith(`${ADMIN_ACCESS_COOKIE}=${fg.auth.access}`))).toBe(true)
    expect(cookies.some((c) => c.startsWith(`${ADMIN_REFRESH_COOKIE}=`))).toBe(true)
    expect(cookies.every((c) => c.includes('HttpOnly'))).toBe(true)
  })

  test('401 com senha errada', async () => {
    const { fg, deps } = setup()
    const res = await adminLogin(loginReq({ email: fg.auth.email, password: 'errada' }), deps)
    expect(res.status).toBe(401)
  })

  test('400 com payload inválido', async () => {
    const { deps } = setup()
    const res = await adminLogin(loginReq({ email: 'nao-eh-email' }), deps)
    expect(res.status).toBe(400)
  })

  test('403 quando a conta não tem papel de admin', async () => {
    const { fg, deps } = setup()
    fg.setAuthUser({ role: 'customer' })
    const res = await adminLogin(
      loginReq({ email: fg.auth.email, password: fg.auth.password }),
      deps,
    )
    expect(res.status).toBe(403)
  })
})

describe('adminLogout', () => {
  test('200, limpa os cookies e revoga o refresh no auth', async () => {
    const { fg, deps } = setup()
    const req = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { cookie: `${ADMIN_REFRESH_COOKIE}=${fg.auth.refresh}` },
    })
    const res = await adminLogout(req, deps)
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.every((c) => c.includes('Max-Age=0'))).toBe(true)
    expect(fg.calls.logout).toContain(fg.auth.refresh)
  })
})

describe('admin auth (sessão via /auth/me)', () => {
  test('401 sem cookie de sessão', async () => {
    const { deps } = setup()
    const res = await adminFunnel(getReq(), deps)
    expect(res.status).toBe(401)
  })

  test('401 com access token inválido e sem refresh', async () => {
    const { deps } = setup()
    const res = await adminLeads(getReq(`${ADMIN_ACCESS_COOKIE}=token-invalido`), deps)
    expect(res.status).toBe(401)
  })

  test('renova via refresh quando o access expira e seta novos cookies', async () => {
    const { repo, fg, deps } = setup()
    await repo.createLead()
    const res = await adminLeads(getReq(`${ADMIN_REFRESH_COOKIE}=${fg.auth.refresh}`), deps)
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.startsWith(`${ADMIN_ACCESS_COOKIE}=`))).toBe(true)
  })
})

describe('adminFunnel', () => {
  test('Comunidade v7: cada ramo tem a sua cadeia e o resultado compara com a soma dos ramos', async () => {
    const { repo, fg, deps, quizVersions } = setup()
    const funnel = 'kids/comunidade-dos-criadores'
    quizVersions.set('def-v7', 'comunidade-vida-v7')
    const v5 = await repo.createLead(funnel, null, 'def-v5')
    await repo.insertEvent(v5.id, 'entrou_landing')
    const lead = async (eventos: string[]) => {
      const { id } = await repo.createLead(funnel, null, 'def-v7')
      for (const e of ['entrou_landing', ...eventos]) await repo.insertEvent(id, e)
    }
    const entrada = ['respondeu_comunidade_v7_genero', 'respondeu_comunidade_v7_idade']
    await lead([
      ...entrada,
      'entrou_ramo_9a12',
      'respondeu_comunidade_v7_9a12_condicao',
      'viu_resultado',
    ])
    await lead([...entrada, 'entrou_ramo_9a12', 'respondeu_comunidade_v7_9a12_condicao'])
    await lead([
      ...entrada,
      'entrou_ramo_m9',
      'respondeu_comunidade_v7_m9_condicao',
      'viu_resultado',
    ])
    await lead([...entrada, 'entrou_ramo_adulto'])
    const res = await adminFunnel(
      new Request(`http://localhost/api/admin?funnel=${encodeURIComponent(funnel)}&quiz=atual`, {
        headers: { cookie: accessCookie(fg) },
      }),
      deps,
    )
    const body = (await res.json()) as {
      total: number
      steps: Array<{
        name: string
        label: string
        count: number
        fromPrev: number
        branch?: string
      }>
    }
    expect(body.total).toBe(4)
    const step = (name: string) => body.steps.find((s) => s.name === name)!
    expect(step('respondeu_comunidade_v7_idade').label).toBe('Pergunta 1 · Idade')
    expect(step('entrou_ramo_9a12')).toMatchObject({
      label: 'Ramo · De 9 a 12 anos',
      count: 2,
      branch: 'De 9 a 12 anos',
    })
    expect(step('entrou_ramo_9a12').fromPrev).toBeCloseTo(2 / 4)
    expect(step('entrou_ramo_m9').fromPrev).toBeCloseTo(1 / 4)
    expect(step('entrou_ramo_adulto').label).toBe('Saída · 18 anos ou mais')
    expect(step('respondeu_comunidade_v7_9a12_condicao').label).toBe(
      'Pergunta 10 · O que precisa conferir',
    )
    expect(step('respondeu_comunidade_v7_m9_condicao').label).toBe(
      'Pergunta 10 · O que precisa conferir',
    )
    // O resultado compara com o fim dos dois ramos com perguntas (2 + 1), sem a saída.
    expect(step('viu_resultado').fromPrev).toBeCloseTo(2 / 3)
  })
  test('Desafio v6: os ramos do Kids no /admin e o quiz adulto sem ramos', async () => {
    const { repo, fg, deps, quizVersions } = setup()
    const funnel = 'kids/desafio-primeiro-jogo'
    quizVersions.set('def-desafio-v6', 'desafio-vida-v6')
    const lead = async (f: string, def: string, eventos: string[]) => {
      const { id } = await repo.createLead(f, null, def)
      for (const e of ['entrou_landing', ...eventos]) await repo.insertEvent(id, e)
    }
    const entrada = ['respondeu_desafio_v6_genero', 'respondeu_desafio_v6_idade']
    await lead(funnel, 'def-desafio-v6', [
      ...entrada,
      'entrou_ramo_9a12',
      'respondeu_desafio_v6_9a12_condicao',
      'viu_resultado',
    ])
    await lead(funnel, 'def-desafio-v6', [
      ...entrada,
      'entrou_ramo_m9',
      'respondeu_desafio_v6_m9_condicao',
    ])
    await lead(funnel, 'def-desafio-v6', [...entrada, 'entrou_ramo_adulto'])
    // Um lead da v4 fica fora do recorte "quiz atual".
    await lead(funnel, 'def-desafio-v4', ['desafio_resposta_idade'])
    const get = async (f: string, query = '') => {
      const res = await adminFunnel(
        new Request(`http://localhost/api/admin?funnel=${encodeURIComponent(f)}${query}`, {
          headers: { cookie: accessCookie(fg) },
        }),
        deps,
      )
      return (await res.json()) as {
        total: number
        steps: Array<{ name: string; label: string; count: number; fromPrev: number }>
      }
    }
    const body = await get(funnel, '&quiz=atual')
    expect(body.total).toBe(3)
    const step = (name: string) => body.steps.find((s) => s.name === name)!
    expect(step('respondeu_desafio_v6_idade').label).toBe('Pergunta 1 · Idade')
    expect(step('entrou_ramo_9a12')).toMatchObject({ label: 'Ramo · De 9 a 12 anos', count: 1 })
    expect(step('entrou_ramo_m9')).toMatchObject({ label: 'Ramo · Menores de 9 anos', count: 1 })
    expect(step('entrou_ramo_adulto').label).toBe('Saída · 18 anos ou mais')
    expect(step('respondeu_desafio_v6_9a12_condicao').label).toBe(
      'Pergunta 10 · O que precisa conferir',
    )
    expect(step('viu_resultado').fromPrev).toBeCloseTo(1 / 2)

    const adulto = 'pro/desafio-primeiro-jogo'
    await lead(adulto, 'def-desafio-adulto', [
      'respondeu_desafio_adulto_v1_computador',
      'respondeu_desafio_adulto_v1_sintese',
      'viu_resultado',
    ])
    const pro = await get(adulto)
    expect(pro.total).toBe(1)
    expect(pro.steps.find((s) => s.name === 'respondeu_desafio_adulto_v1_sintese')?.label).toBe(
      'Pergunta 8 · Frase-síntese',
    )
    expect(pro.steps.some((s) => s.name.startsWith('entrou_ramo_'))).toBe(false)
  })
  test('agrega contagem e conversão por etapa (com sessão)', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.insertEvent(a.id, 'entrou_landing')
    await repo.insertEvent(b.id, 'entrou_landing')
    await repo.insertEvent(a.id, 'respondeu_comunidade_adulto_v1_tempo_jogo')

    const res = await adminFunnel(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      steps: Array<{ name: string; count: number; fromTop: number; fromPrev: number }>
    }
    expect(body.total).toBe(2)
    const landing = body.steps.find((s) => s.name === 'entrou_landing')
    const p1 = body.steps.find((s) => s.name === 'respondeu_comunidade_adulto_v1_tempo_jogo')
    expect(landing?.count).toBe(2)
    expect(p1?.count).toBe(1)
    expect(p1?.fromTop).toBeCloseTo(0.5)
    expect(p1?.fromPrev).toBeCloseTo(0.5)
  })
})

describe('adminLeads', () => {
  test('ordena respostas pelo snapshot, preserva textos antigos e consulta cada definição uma vez', async () => {
    const { repo, fg, deps, definitions } = setup()
    const id = 'snapshot-arquivado'
    definitions.set(id, {
      id,
      funnel: 'kids/desafio-primeiro-jogo',
      version: 'desafio-anterior',
      questions: [
        {
          id: 'idade',
          title: 'Idade na versão arquivada',
          position: 2,
          type: 'selecao',
          revision: 'old',
          options: [{ value: '9_12', label: 'Faixa arquivada' }],
        },
        {
          id: 'genero',
          title: 'Entrada arquivada',
          position: 1,
          type: 'selecao',
          revision: 'old',
          options: [{ value: 'filha', label: 'Minha filha na versão arquivada' }],
        },
      ],
    })
    for (let i = 0; i < 2; i++) {
      const lead = await repo.createLead('kids/desafio-primeiro-jogo', null, id)
      await repo.updateLead(lead.id, {
        quizAnswers: { idade: '9_12', genero: 'filha', _quiz_version: 'desafio-anterior' },
      })
    }
    let reads = 0
    const response = await adminLeads(leadsReq(fg), {
      ...deps,
      quizDefinitions: {
        quiz: async (key) => {
          reads++
          return definitions.get(key) ?? null
        },
      },
    })
    expect(response.status).toBe(200)
    expect(reads).toBe(1)
    for (const lead of (await response.json()).leads) {
      expect(lead.answerDetails.map((q: { key: string }) => q.key)).toEqual(['genero', 'idade'])
      expect(lead.answerDetails[1]).toMatchObject({
        label: 'Idade na versão arquivada',
        options: { '9_12': 'Faixa arquivada' },
      })
    }
  })
  test('sem snapshot, mantém perguntas antigas legíveis e na ordem declarada', async () => {
    const { repo, fg, deps } = setup()
    const lead = await repo.createLead('kids/desafio-primeiro-jogo')
    await repo.updateLead(lead.id, {
      quizAnswers: {
        vida_9a12_cena: 'erro',
        idade: '9_12',
        genero: 'filha',
        vida_9a12_interesse: 'jogos',
        _quiz_version: 'desafio-vida-v6',
      },
    })
    const response = await adminLeads(leadsReq(fg), deps)
    expect(
      (await response.json()).leads[0].answerDetails.map((q: { key: string }) => q.key),
    ).toEqual(['genero', 'idade', 'vida_9a12_interesse', 'vida_9a12_cena'])
  })
  test('lista os leads com sessão (com total)', async () => {
    const { repo, fg, deps } = setup()
    await repo.createLead()
    const res = await adminLeads(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { leads: unknown[]; total: number }
    expect(body.leads).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  test('pagina por limit/offset e devolve o total', async () => {
    const { repo, fg, deps } = setup()
    for (let i = 0; i < 30; i++) await repo.createLead()

    const page1 = (await (await adminLeads(leadsReq(fg, '?limit=25&offset=0'), deps)).json()) as {
      leads: unknown[]
      total: number
      limit: number
      offset: number
    }
    expect(page1.total).toBe(30)
    expect(page1.leads).toHaveLength(25)
    expect(page1.limit).toBe(25)
    expect(page1.offset).toBe(0)

    const page2 = (await (await adminLeads(leadsReq(fg, '?limit=25&offset=25'), deps)).json()) as {
      leads: unknown[]
    }
    expect(page2.leads).toHaveLength(5)
  })

  test('busca por nome/e-mail filtra o total (server-side)', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.updateLead(a.id, { nome: 'Maria Silva', email: 'maria@example.com' })
    await repo.updateLead(b.id, { nome: 'João Souza', email: 'joao@example.com' })

    const res = await adminLeads(leadsReq(fg, '?q=maria'), deps)
    const body = (await res.json()) as { leads: { id: string }[]; total: number }
    expect(body.total).toBe(1)
    expect(body.leads).toHaveLength(1)
    expect(body.leads[0]?.id).toBe(a.id)
  })

  test('clampa o limit acima do teto (100)', async () => {
    const { fg, deps } = setup()
    const body = (await (await adminLeads(leadsReq(fg, '?limit=9999'), deps)).json()) as {
      limit: number
    }
    expect(body.limit).toBe(100)
  })

  test('relatório por evento deduplica leads e separa R$ 67 de R$ 37 sem CPF', async () => {
    const { repo, fg, deps } = setup()
    const attribution = {
      version: 1 as const,
      utmSource: 'escola-centro',
      utmMedium: 'qr',
      utmCampaign: 'setembro',
      utmContent: null,
      eventCode: 'ESCOLA_2026_09',
      initialCouponCode: 'EVENTO37',
      landingPath: '/kids/desafio-primeiro-jogo/oferta',
    }
    const full = await repo.createLead('kids/desafio-primeiro-jogo', attribution)
    const event = await repo.createLead('kids/desafio-primeiro-jogo', attribution)
    for (const [leadId, paymentId, price, coupon] of [
      [full.id, 'pay-full', 6700, null],
      [event.id, 'pay-event', 3700, 'EVENTO37'],
    ] as const) {
      await repo.updateLead(leadId, {
        offerRef: 'desafio-primeiro-jogo-30-dias',
        document: '12345678900',
      })
      await repo.setPayment(leadId, paymentId, coupon, {
        offerRef: 'desafio-primeiro-jogo-30-dias',
        offerSnapshot: {
          version: 1,
          offerId: 'offer-id',
          offerSlug: 'desafio-primeiro-jogo-30-dias',
          pricingMode: 'one_time',
          billingIntervalMonths: null,
          accessMode: 'fixed',
          accessDurationValue: 30,
          accessDurationUnit: 'days',
          listPriceCents: 6700,
          couponCode: coupon,
          discountCents: 6700 - price,
          chargedPriceCents: price,
          currency: 'BRL',
          guaranteeDays: 7,
          termsVersion: 'kids-2026-09-16',
        },
      })
      await repo.markPaid(leadId, new Date())
      await repo.insertEvent(leadId, 'pagamento_confirmado')
      await repo.insertEvent(leadId, 'pagamento_confirmado')
    }

    const res = await adminLeads(
      leadsReq(fg, '?event_code=ESCOLA_2026_09&funnel=kids%2Fdesafio-primeiro-jogo'),
      deps,
    )
    const body = (await res.json()) as {
      total: number
      eventReport: {
        steps: Array<{ name: string; leads: number }>
        prices: Array<{ chargedPriceCents: number; leads: number }>
      }
    }
    expect(body.total).toBe(2)
    expect(body.eventReport.steps.find((step) => step.name === 'payment_approved')?.leads).toBe(2)
    expect(body.eventReport.prices).toEqual([
      { chargedPriceCents: 3700, leads: 1 },
      { chargedPriceCents: 6700, leads: 1 },
    ])
    expect(JSON.stringify(body.eventReport)).not.toContain('12345678900')
  })
})

describe('adminPerfis', () => {
  test('Comunidade enumera os perfis dos dois ramos e mostra os da v5 que ainda têm leads', async () => {
    const { repo, fg, deps } = setup()
    const funnel = 'kids/comunidade-dos-criadores'
    const lead = await repo.createLead(funnel)
    await repo.updateLead(lead.id, { perfilResultado: 'm9-ideias' })
    const antigo = await repo.createLead(funnel)
    await repo.updateLead(antigo.id, { perfilResultado: 'expressao-visual' })
    await repo.createLead(funnel)
    const response = await adminPerfis(
      new Request(`http://localhost/api/admin?funnel=${encodeURIComponent(funnel)}`, {
        headers: { cookie: accessCookie(fg) },
      }),
      deps,
    )
    const body = await response.json()
    expect(body.counts.map((c: { perfil: string }) => c.perfil)).toEqual([
      ...Object.keys(profileLabels),
      'm9-ideias',
      'expressao-visual',
    ])
    expect(body.total).toBe(2)
    expect(
      body.counts.find((c: { perfil: string }) => c.perfil === 'vida-9a12-planejar')?.count,
    ).toBe(0)
    // O perfil da v5 aparece com o rótulo de antes, marcado como quiz anterior.
    expect(body.counts.find((c: { perfil: string }) => c.perfil === 'expressao-visual')).toEqual({
      perfil: 'expressao-visual',
      label: '(quiz anterior) Desenho e personagens',
      count: 1,
    })
  })
  test('perfil fora da lista de hoje continua visível, pelo próprio nome', async () => {
    const { repo, fg, deps } = setup()
    const funnel = 'kids/comunidade-dos-criadores'
    const lead = await repo.createLead(funnel)
    await repo.updateLead(lead.id, { perfilResultado: 'perfil-de-versao-antiga' })
    const body = await (
      await adminPerfis(
        new Request(`http://localhost/api/admin?funnel=${encodeURIComponent(funnel)}`, {
          headers: { cookie: accessCookie(fg) },
        }),
        deps,
      )
    ).json()
    expect(body.total).toBe(1)
    expect(body.counts.at(-1)).toEqual({
      perfil: 'perfil-de-versao-antiga',
      label: 'perfil-de-versao-antiga',
      count: 1,
    })
  })
  test('quiz atual e manchete recortam os perfis da Comunidade', async () => {
    const { repo, fg, deps, quizVersions } = setup()
    const funnel = 'kids/comunidade-dos-criadores'
    quizVersions.set('def-v5', 'comunidade-orientacao-v5')
    quizVersions.set('def-v6', 'comunidade-vida-v7')
    const make = async (definition: string, quizHeadline: string | null, perfil: string) => {
      const attribution = quizHeadline
        ? {
            version: 1 as const,
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            utmContent: null,
            eventCode: null,
            initialCouponCode: null,
            landingPath: '/',
            quizHeadline,
          }
        : null
      const { id } = await repo.createLead(funnel, attribution, definition)
      await repo.updateLead(id, { perfilResultado: perfil })
    }
    await make('def-v5', null, 'tempo-de-tela')
    await make('def-v6', 'habilidades', 'vida-9a12-planejar')
    await make('def-v6', 'habilidades', 'vida-13a17-expressar')
    await make('def-v6', null, 'vida-m9-explorar')
    const total = async (query: string) =>
      (
        await (
          await adminPerfis(
            new Request(`http://localhost/api/admin?funnel=${encodeURIComponent(funnel)}${query}`, {
              headers: { cookie: accessCookie(fg) },
            }),
            deps,
          )
        ).json()
      ).total
    expect(await total('')).toBe(4)
    expect(await total('&quiz=atual')).toBe(3)
    expect(await total('&quiz=atual&manchete=habilidades')).toBe(3)
    expect(await total('&manchete=habilidades')).toBe(3)
    expect(await total('&manchete=tela')).toBe(4) // Variante anterior não é reinterpretada como a nova.
    expect(await total('&manchete=inventada')).toBe(4)
  })
  test('401 sem sessão', async () => {
    const { deps } = setup()
    const res = await adminPerfis(getReq(), deps)
    expect(res.status).toBe(401)
  })

  test('com funil selecionado: os perfis do funil, na ordem, com rótulo e total', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead(DEFAULT_FUNNEL.key)
    const b = await repo.createLead(DEFAULT_FUNNEL.key)
    const c = await repo.createLead(DEFAULT_FUNNEL.key)
    await repo.createLead(DEFAULT_FUNNEL.key) // sem perfil → não conta
    await repo.updateLead(a.id, { perfilResultado: 'adulto-ideia' })
    await repo.updateLead(b.id, { perfilResultado: 'adulto-ideia' })
    await repo.updateLead(c.id, { perfilResultado: 'adulto-por-dentro' })

    const req = new Request(
      `http://localhost/api/admin?funnel=${encodeURIComponent(DEFAULT_FUNNEL.key)}`,
      { headers: { cookie: accessCookie(fg) } },
    )
    const res = await adminPerfis(req, deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      counts: Array<{ perfil: string; label: string; count: number }>
    }
    expect(body.total).toBe(3)
    // Perfis do funil (mesmo zerados), na ordem do funil.
    expect(body.counts.map((c) => c.perfil)).toEqual([
      'adulto-horas-livres',
      'adulto-ideia',
      'adulto-por-dentro',
    ])
    const byPerfil = new Map(body.counts.map((c) => [c.perfil, c.count]))
    expect(byPerfil.get('adulto-ideia')).toBe(2)
    expect(byPerfil.get('adulto-por-dentro')).toBe(1)
    expect(byPerfil.get('adulto-horas-livres')).toBe(0)
    // Rótulo legível (não a chave crua) quando o funil é selecionado.
    expect(body.counts.find((c) => c.perfil === 'adulto-ideia')?.label).toBe('Ideia')
  })

  test('sem funil: só os perfis presentes nos dados (rótulo = a chave)', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead(DEFAULT_FUNNEL.key)
    await repo.updateLead(a.id, { perfilResultado: 'sem_criterio' })

    const res = await adminPerfis(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      counts: Array<{ perfil: string; label: string; count: number }>
    }
    expect(body.total).toBe(1)
    expect(body.counts).toEqual([{ perfil: 'sem_criterio', label: 'sem_criterio', count: 1 }])
  })
})

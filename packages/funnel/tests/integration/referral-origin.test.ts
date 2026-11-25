import { beforeEach, describe, expect, test } from 'bun:test'
import type { Env } from '../../src/lib/env'
import {
  ORIGIN_COOKIE,
  originCookie,
  originFromRequest,
  placeCookieFor,
} from '../../src/lib/lead-origin'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { isRateLimitedGetPath } from '../../src/lib/rate-limit-paths'
import {
  campaignRedirectFor,
  clearCampaignRedirectCache,
  redirectCandidate,
} from '../../src/server/campaign-redirect'
import { clearOfferCache } from '../../src/server/catalog'
import { pixContentFingerprint, startBoleto, startPix } from '../../src/server/checkout'
import { referralLinkRedirect } from '../../src/server/referral-link'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const CONTACT = {
  nome: 'Ana Souza',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  telefone: '(11) 98888-7777',
}
const ENV = {
  offerByFunnel: {
    'kids/desafio-primeiro-jogo': 'desafio-primeiro-jogo-30-dias',
    'kids/comunidade-dos-criadores': 'comunidade-dos-criadores-mensal',
  },
} as unknown as Env

const linkBody = (overrides: Record<string, unknown> = {}) => ({
  code: 'mari-x7k2',
  audience: 'kids',
  sourceKind: 'ambassador',
  mode: 'sale',
  offerId: 'offer-1',
  offerSlug: 'desafio-primeiro-jogo-30-dias',
  target: 'page',
  state: 'active',
  couponCode: null,
  ...overrides,
})

function checkoutDeps(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  gw: ReturnType<typeof createFakeGateway>,
) {
  return {
    repo,
    gateway: gw.gateway,
    resolveOffer: () => ({
      offerSlug: 'curso-qa',
      productName: 'Curso de teste',
      productSku: 'curso-qa',
    }),
    fulfill: async () => {},
    grantMembers: async () => {},
  }
}

function post(cookie: string, body: unknown): Request {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

describe('cookie da origem', () => {
  test('código e lugar viram cookie e voltam saneados; lixo é ignorado', () => {
    const cookie = originCookie({ version: 1, code: 'mari-x7k2', place: null }, true)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    const value = cookie.split(';')[0]!
    expect(originFromRequest(new Request('http://x', { headers: { cookie: value } }))).toEqual({
      version: 1,
      code: 'mari-x7k2',
      place: null,
    })
    const bad = new Request('http://x', { headers: { cookie: `${ORIGIN_COOKIE}=c:%3Cscript%3E` } })
    expect(originFromRequest(bad)).toBeNull()
    expect(
      placeCookieFor(new URL('http://x/kids/oferta?lugar=pais-curso-fechado'), false),
    ).toContain('p%3Apais-curso-fechado')
    expect(placeCookieFor(new URL('http://x/kids/oferta?lugar=Ã'), false)).toBeNull()
  })

  test('/i/ entra no teto de GET por IP', () => {
    expect(isRateLimitedGetPath('/i/mari-x7k2')).toBe(true)
    expect(isRateLimitedGetPath('/i/mari-x7k2/desafio/pagamento')).toBe(true)
  })
})

describe('GET /i/<código>[/<oferta>][/pagamento]', () => {
  beforeEach(() => clearOfferCache())

  test('venda pela página: oferta com ?indicacao, cupom e UTM; grava a origem', async () => {
    const gw = createFakeGateway()
    gw.setLinkResult(200, linkBody({ couponCode: 'black10' }))
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio-primeiro-jogo-30-dias?utm_source=instagram'),
      { code: 'mari-x7k2', offer: 'desafio-primeiro-jogo-30-dias' },
      { env: ENV, gateway: gw.gateway, secureCookie: false },
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      '/kids/desafio-primeiro-jogo/oferta?indicacao=mari-x7k2&cupom=BLACK10&utm_source=instagram',
    )
    expect(res.headers.get('set-cookie')).toContain(`${ORIGIN_COOKIE}=c%3Amari-x7k2`)
    expect(gw.calls.links[0]).toEqual({
      code: 'mari-x7k2',
      offerSlug: 'desafio-primeiro-jogo-30-dias',
      checkout: false,
    })
  })

  test('direto ao pagamento: checkout do funil (a irmã do alternador vai com ?oferta)', async () => {
    const gw = createFakeGateway()
    gw.setOfferConfig('comunidade-dos-criadores-mensal', {
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      altOffer: { slug: 'comunidade-dos-criadores-anual' },
    })
    gw.setLinkResult(
      200,
      linkBody({ offerSlug: 'comunidade-dos-criadores-anual', target: 'checkout' }),
    )
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/pagamento'),
      { code: 'mari-x7k2', offer: 'pagamento' },
      { env: ENV, gateway: gw.gateway, secureCookie: false },
    )
    expect(gw.calls.links[0]).toMatchObject({ offerSlug: null, checkout: true })
    expect(res.headers.get('location')).toBe(
      '/kids/comunidade-dos-criadores/checkout?oferta=comunidade-dos-criadores-anual',
    )
  })

  test('presente leva à página do presente; 404 uniforme; referrals fora = 502', async () => {
    const gw = createFakeGateway()
    gw.setLinkResult(200, linkBody({ mode: 'gift', offerSlug: 'cade-todo-mundo-7-dias' }))
    const deps = { env: ENV, gateway: gw.gateway, secureCookie: false }
    const gift = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2'),
      { code: 'mari-x7k2' },
      deps,
    )
    expect(gift.headers.get('location')).toBe('/bolsa/mari-x7k2')

    gw.setLinkResult(404)
    expect(
      (await referralLinkRedirect(new URL('http://f/i/nada-0000'), { code: 'nada-0000' }, deps))
        .status,
    ).toBe(404)
    gw.setLinkResult(502)
    expect(
      (await referralLinkRedirect(new URL('http://f/i/mari-x7k2'), { code: 'mari-x7k2' }, deps))
        .status,
    ).toBe(502)
    // Terceiro segmento que não é `pagamento` nem chega ao referrals.
    const calls = gw.calls.links.length
    const odd = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio/outro'),
      { code: 'mari-x7k2', offer: 'desafio', target: 'outro' },
      deps,
    )
    expect(odd.status).toBe(404)
    expect(gw.calls.links).toHaveLength(calls)
  })

  test('venda de oferta sem página de compra no funil: 404 com explicação', async () => {
    const gw = createFakeGateway()
    gw.setLinkResult(200, linkBody({ offerSlug: 'oferta-sem-funil' }))
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/oferta-sem-funil'),
      { code: 'mari-x7k2', offer: 'oferta-sem-funil' },
      { env: ENV, gateway: gw.gateway, secureCookie: false },
    )
    expect(res.status).toBe(404)
  })
})

describe('endereço antigo de campanha', () => {
  beforeEach(() => clearCampaignRedirectCache())

  test('só caminhos possíveis e sem parâmetros de link (sem laço)', () => {
    expect(redirectCandidate(new URL('http://f/kids/vilao-em-aliado/'))).toBe(
      '/kids/vilao-em-aliado',
    )
    expect(redirectCandidate(new URL('http://f/kids/vilao-em-aliado?presente=x'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/bolsa/abcd'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/img/a.webp'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/'))).toBeNull()
  })

  test('ativo leva ao /i/ da campanha com a query; cache evita nova consulta', async () => {
    const gw = createFakeGateway()
    gw.setRedirectResult(200, { url: 'https://sistemazero.com.br/i/guia-pais', until: null })
    const url = new URL('http://f/kids/vilao-em-aliado?utm_source=whatsapp')
    expect(await campaignRedirectFor(url, gw.gateway, 1000)).toBe(
      '/i/guia-pais?utm_source=whatsapp',
    )
    expect(await campaignRedirectFor(url, gw.gateway, 2000)).toBe(
      '/i/guia-pais?utm_source=whatsapp',
    )
    expect(gw.calls.redirects).toEqual(['/kids/vilao-em-aliado'])
  })

  test('sem campanha, destino fora do /i/ ou referrals fora: abre a página', async () => {
    const gw = createFakeGateway()
    expect(await campaignRedirectFor(new URL('http://f/kids/outra'), gw.gateway)).toBeNull()
    gw.setRedirectResult(200, { url: 'https://golpe.example/x' })
    expect(await campaignRedirectFor(new URL('http://f/kids/mais-uma'), gw.gateway)).toBeNull()
    gw.setRedirectResult(503)
    expect(await campaignRedirectFor(new URL('http://f/kids/terceira'), gw.gateway)).toBeNull()
  })
})

describe('origem no metadata do pagamento', () => {
  test('Pix leva origemCodigo e origemFonte; a origem muda a chave de idempotência', async () => {
    const { repo, leads } = createFakeRepo()
    const { id } = await repo.createLead(null, {
      version: 1,
      utmSource: 'google_ads',
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      eventCode: null,
      initialCouponCode: null,
      landingPath: '/',
    })
    const gw = createFakeGateway()
    const cookie = `${LEAD_COOKIE}=${id}; ${ORIGIN_COOKIE}=c%3Amari-x7k2`
    const res = await startPix(post(cookie, { contact: CONTACT }), checkoutDeps(repo, gw))
    expect(res.status).toBe(200)
    const input = gw.calls.create[0]?.input as { metadata: Record<string, unknown> }
    expect(input.metadata).toMatchObject({ origemCodigo: 'mari-x7k2', origemFonte: 'google_ads' })
    expect(leads.get(id)?.origin).toEqual({ version: 1, code: 'mari-x7k2', place: null })
    const plain = await pixContentFingerprint({
      amountInCents: 3700,
      couponCode: null,
      contact: CONTACT,
    })
    expect(gw.calls.create[0]?.idempotencyKey).not.toBe(`funil-${id}-${plain}`)
  })

  test('botão da plataforma vai como origemLugar; boleto não leva a origem', async () => {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com', telefone: '11999998888' })
    const gw = createFakeGateway()
    const cookie = `${LEAD_COOKIE}=${id}; ${ORIGIN_COOKIE}=p%3Apais-inicio`
    await startPix(post(cookie, { contact: CONTACT }), checkoutDeps(repo, gw))
    expect(
      (gw.calls.create[0]?.input as { metadata: Record<string, unknown> }).metadata,
    ).toMatchObject({
      origemLugar: 'pais-inicio',
    })
    const boletoGw = createFakeGateway()
    await startBoleto(
      post(cookie, {
        cpf: '52998224725',
        address: {
          street: 'Rua das Flores',
          number: '100',
          neighborhood: 'Centro',
          zipcode: '01001000',
          city: 'São Paulo',
          state: 'SP',
        },
      }),
      checkoutDeps(repo, boletoGw),
    )
    const boleto = (boletoGw.calls.create[0]?.input as { metadata: Record<string, unknown> })
      .metadata
    expect(boleto.origemLugar).toBeUndefined()
    expect(boleto.origemCodigo).toBeUndefined()
  })
})

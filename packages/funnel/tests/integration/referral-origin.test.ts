import { beforeEach, describe, expect, test } from 'bun:test'
import {
  ORIGIN_COOKIE,
  originCookie,
  originCookieFor,
  originFromRequest,
} from '../../src/lib/lead-origin'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { isRateLimitedGetPath } from '../../src/lib/rate-limit-paths'
import { createCampaignRedirects, redirectCandidate } from '../../src/server/campaign-redirect'
import { clearOfferCache } from '../../src/server/catalog'
import { pixContentFingerprint, startBoleto, startPix } from '../../src/server/checkout'
import { clearPrimaryOfferCache } from '../../src/server/page-offer'
import { referralLinkRedirect } from '../../src/server/referral-link'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

test('link /i de benefício preservado não grava origem comercial nem libera presente público', async () => {
  const response = await referralLinkRedirect(
    new URL('https://funnel.test/i/guia-cade'),
    { code: 'guia-cade' },
    {
      secureCookie: true,
      gateway: {
        ...createFakeGateway().gateway,
        resolveReferralLink: async () => ({
          status: 200,
          body: {
            kind: 'course_benefit',
            code: 'guia-cade',
            audience: 'kids',
            courseSlug: 'transformando-o-vilao-em-aliado',
          },
        }),
      },
    },
  )
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('/bolsa/guia-cade')
  expect(response.headers.get('set-cookie')).toBeNull()
})

const CONTACT = {
  nome: 'Ana Souza',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  telefone: '(11) 98888-7777',
}
/** O catálogo falso com as páginas do Desafio e da Comunidade Kids (a principal de cada produto). */
function pagesGateway() {
  clearPrimaryOfferCache()
  const gw = createFakeGateway()
  gw.setProductPrimary('desafio-primeiro-jogo', 'desafio-primeiro-jogo-30-dias')
  gw.setOfferConfig('desafio-primeiro-jogo-30-dias', {
    productSku: 'desafio-primeiro-jogo',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
  })
  gw.setProductPrimary('comunidade-dos-criadores', 'comunidade-dos-criadores-mensal')
  return gw
}

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
      originCookieFor(new URL('http://x/kids/oferta?lugar=pais-curso-fechado'), false),
    ).toContain('p%3Apais-curso-fechado')
    expect(originCookieFor(new URL('http://x/kids/oferta?lugar=Ã'), false)).toBeNull()
    // A página aberta pelo /i/ (ou copiada para outro navegador) regrava o código; ele vence.
    expect(
      originCookieFor(new URL('http://x/kids/oferta?indicacao=mari-x7k2&lugar=pais-inicio'), false),
    ).toContain('c%3Amari-x7k2')
  })

  test('/i/ entra no teto de GET por IP', () => {
    expect(isRateLimitedGetPath('/i/mari-x7k2')).toBe(true)
    expect(isRateLimitedGetPath('/i/mari-x7k2/desafio/pagamento')).toBe(true)
  })
})

describe('GET /i/<código>[/<oferta>][/pagamento]', () => {
  beforeEach(() => clearOfferCache())

  test('venda pela página: oferta com ?indicacao, cupom e UTM; grava a origem', async () => {
    const gw = pagesGateway()
    gw.setLinkResult(200, linkBody({ couponCode: 'black10' }))
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio-primeiro-jogo-30-dias?utm_source=instagram'),
      { code: 'mari-x7k2', offer: 'desafio-primeiro-jogo-30-dias' },
      { gateway: gw.gateway, secureCookie: false },
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

  test('catálogo fora ao achar a página da venda: 502 "tente de novo", nunca 404', async () => {
    const gw = pagesGateway()
    gw.setLinkResult(200, linkBody())
    gw.setProductResult(503)
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio-primeiro-jogo-30-dias'),
      { code: 'mari-x7k2', offer: 'desafio-primeiro-jogo-30-dias' },
      { gateway: gw.gateway, secureCookie: false },
    )
    expect(res.status).toBe(502)
    expect(await res.text()).toContain('Tente de novo')
  })

  test('direto ao pagamento: checkout do funil (a irmã do alternador vai com ?oferta)', async () => {
    const gw = pagesGateway()
    gw.setOfferConfig('comunidade-dos-criadores-mensal', {
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      altOffer: { slug: 'comunidade-dos-criadores-anual' },
      productSku: 'comunidade-dos-criadores',
    })
    gw.setLinkResult(
      200,
      linkBody({ offerSlug: 'comunidade-dos-criadores-anual', target: 'checkout' }),
    )
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/pagamento'),
      { code: 'mari-x7k2', offer: 'pagamento' },
      { gateway: gw.gateway, secureCookie: false },
    )
    expect(gw.calls.links[0]).toMatchObject({ offerSlug: null, checkout: true })
    expect(res.headers.get('location')).toBe(
      '/kids/comunidade-dos-criadores/checkout?oferta=comunidade-dos-criadores-anual&indicacao=mari-x7k2',
    )
  })

  test('irmã do alternador com destino na página também vai ao checkout (o plano certo)', async () => {
    const gw = pagesGateway()
    gw.setOfferConfig('comunidade-dos-criadores-mensal', {
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      altOffer: { slug: 'comunidade-dos-criadores-anual' },
      productSku: 'comunidade-dos-criadores',
    })
    gw.setLinkResult(200, linkBody({ offerSlug: 'comunidade-dos-criadores-anual' }))
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/comunidade-dos-criadores-anual'),
      { code: 'mari-x7k2', offer: 'comunidade-dos-criadores-anual' },
      { gateway: gw.gateway, secureCookie: false },
    )
    expect(res.headers.get('location')).toStartWith('/kids/comunidade-dos-criadores/checkout?')
  })

  test('slug acima de 80 e 4xx do referrals são 404, nunca 502', async () => {
    const gw = pagesGateway()
    const deps = { gateway: gw.gateway, secureCookie: false }
    const long = 'a'.repeat(81)
    expect(
      (
        await referralLinkRedirect(
          new URL(`http://f/i/mari-x7k2/${long}`),
          { code: 'mari-x7k2', offer: long },
          deps,
        )
      ).status,
    ).toBe(404)
    expect(gw.calls.links).toHaveLength(0)
    gw.setLinkResult(422)
    expect(
      (await referralLinkRedirect(new URL('http://f/i/mari-x7k2'), { code: 'mari-x7k2' }, deps))
        .status,
    ).toBe(404)
  })

  test('presente leva à página do presente; 404 uniforme; referrals fora = 502', async () => {
    const gw = pagesGateway()
    gw.setLinkResult(200, linkBody({ mode: 'gift', offerSlug: 'cade-todo-mundo-7-dias' }))
    const deps = { gateway: gw.gateway, secureCookie: false }
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

  test('presente sempre passa pela página do presente, levando a escolha do embaixador', async () => {
    const gw = pagesGateway()
    const deps = { gateway: gw.gateway, secureCookie: false }
    gw.setLinkResult(200, linkBody({ mode: 'gift', offerSlug: 'desafio-primeiro-jogo-30-dias' }))
    const comPagina = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio-primeiro-jogo-30-dias'),
      { code: 'mari-x7k2', offer: 'desafio-primeiro-jogo-30-dias' },
      deps,
    )
    // A página do presente resolve o curso e redireciona (uma página por curso).
    expect(comPagina.headers.get('location')).toBe(
      '/bolsa/mari-x7k2?oferta=desafio-primeiro-jogo-30-dias',
    )
    gw.setLinkResult(200, linkBody({ mode: 'gift', offerSlug: 'guia-sem-pagina' }))
    const semPagina = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/guia-sem-pagina'),
      { code: 'mari-x7k2', offer: 'guia-sem-pagina' },
      deps,
    )
    expect(semPagina.headers.get('location')).toBe('/bolsa/mari-x7k2?oferta=guia-sem-pagina')
  })

  test('link curto por curso: /i/<código>/<apelido>[/pagamento|/presente] pede ao referrals pelo produto', async () => {
    const gw = pagesGateway()
    const deps = { gateway: gw.gateway, secureCookie: false }
    gw.setLinkResult(200, linkBody())
    const venda = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio'),
      { code: 'mari-x7k2', offer: 'desafio' },
      deps,
    )
    expect(venda.headers.get('location')).toBe(
      '/kids/desafio-primeiro-jogo/oferta?indicacao=mari-x7k2',
    )
    expect(gw.calls.links[0]).toMatchObject({
      code: 'mari-x7k2',
      checkout: false,
      kind: 'referral',
    })
    expect(gw.calls.links[0]?.skus?.toSorted()).toEqual([
      'desafio-primeiro-jogo',
      'desafio-primeiro-jogo-adulto',
    ])

    gw.setLinkResult(200, linkBody({ target: 'checkout' }))
    const pagamento = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio/pagamento'),
      { code: 'mari-x7k2', offer: 'desafio', target: 'pagamento' },
      deps,
    )
    expect(pagamento.headers.get('location')).toStartWith('/kids/desafio-primeiro-jogo/checkout?')
    expect(gw.calls.links[1]).toMatchObject({ checkout: true, kind: 'referral' })

    gw.setLinkResult(200, linkBody({ mode: 'gift', offerSlug: 'cade-todo-mundo-15-dias' }))
    const presente = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/cade/presente'),
      { code: 'mari-x7k2', offer: 'cade', target: 'presente' },
      deps,
    )
    expect(presente.headers.get('location')).toBe('/bolsa/mari-x7k2?oferta=cade-todo-mundo-15-dias')
    expect(gw.calls.links[2]?.kind).toBe('gift')
    expect(gw.calls.links[2]?.skus?.toSorted()).toEqual([
      'cade-todo-mundo',
      'cade-todo-mundo-adulto',
    ])

    // `/presente` só depois de um apelido; depois de um slug de oferta continua 404.
    const torto = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/desafio-primeiro-jogo-30-dias/presente'),
      { code: 'mari-x7k2', offer: 'desafio-primeiro-jogo-30-dias', target: 'presente' },
      deps,
    )
    expect(torto.status).toBe(404)
    expect(gw.calls.links).toHaveLength(3)
  })

  test('venda de oferta sem página de compra no funil: 404 com explicação', async () => {
    const gw = pagesGateway()
    gw.setLinkResult(200, linkBody({ offerSlug: 'oferta-sem-funil' }))
    const res = await referralLinkRedirect(
      new URL('http://f/i/mari-x7k2/oferta-sem-funil'),
      { code: 'mari-x7k2', offer: 'oferta-sem-funil' },
      { gateway: gw.gateway, secureCookie: false },
    )
    expect(res.status).toBe(404)
  })
})

describe('endereço antigo de campanha', () => {
  const LIST = {
    items: [
      {
        path: '/kids/vilao-em-aliado',
        url: 'https://sistemazero.com.br/i/guia-pais',
        until: new Date(86_400_000).toISOString(),
      },
      {
        path: '/kids/golpe',
        url: 'https://golpe.example/x',
        until: new Date(86_400_000).toISOString(),
      },
    ],
  }

  test('prazo do redirecionamento vence no cache, mesmo com o serviço fora', async () => {
    const gw = createFakeGateway()
    gw.setRedirectResult(200, {
      items: [
        {
          path: '/kids/vilao-em-aliado',
          url: 'https://sistemazero.com.br/i/guia-pais',
          until: new Date(10_000).toISOString(),
        },
      ],
    })
    let now = 1_000
    const redirects = createCampaignRedirects({ gateway: gw.gateway, now: () => now })
    const url = new URL('http://f/kids/vilao-em-aliado')
    expect(await redirects.lookup(url)).toBe('/i/guia-pais')
    gw.setRedirectResult(503)
    now = 10_000
    expect(await redirects.lookup(url)).toBeNull()
    now = 100_000
    expect(await redirects.lookup(url)).toBeNull()
  })

  test('só caminhos possíveis e sem parâmetros de link (sem laço)', () => {
    expect(redirectCandidate(new URL('http://f/kids/vilao-em-aliado/'))).toBe(
      '/kids/vilao-em-aliado',
    )
    expect(redirectCandidate(new URL('http://f/kids/vilao-em-aliado?presente=x'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/bolsa/abcd'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/img/a.webp'))).toBeNull()
    expect(redirectCandidate(new URL('http://f/'))).toBeNull()
  })

  test('uma lista por minuto: caminhos diferentes não viram chamadas; lugar não passa adiante', async () => {
    const gw = createFakeGateway()
    gw.setRedirectResult(200, LIST)
    let now = 1_000
    const redirects = createCampaignRedirects({ gateway: gw.gateway, now: () => now })
    expect(
      await redirects.lookup(
        new URL('http://f/kids/vilao-em-aliado?utm_source=whatsapp&lugar=pais-inicio'),
      ),
    ).toBe('/i/guia-pais?utm_source=whatsapp')
    for (let i = 0; i < 50; i++)
      expect(await redirects.lookup(new URL(`http://f/x/${i}`))).toBeNull()
    // Destino fora do /i/ é descartado.
    expect(await redirects.lookup(new URL('http://f/kids/golpe'))).toBeNull()
    expect(gw.calls.redirects).toBe(1)
    now += 61_000
    await redirects.lookup(new URL('http://f/kids/vilao-em-aliado'))
    expect(gw.calls.redirects).toBe(2)
  })

  test('caminho que nunca pode ser endereço antigo nem consulta; referrals fora abre a página', async () => {
    const gw = createFakeGateway()
    gw.setRedirectResult(503)
    let now = 0
    const redirects = createCampaignRedirects({ gateway: gw.gateway, now: () => now })
    expect(await redirects.lookup(new URL('http://f/bolsa/abcd'))).toBeNull()
    expect(gw.calls.redirects).toBe(0)
    expect(await redirects.lookup(new URL('http://f/kids/vilao-em-aliado'))).toBeNull()
    expect(await redirects.lookup(new URL('http://f/kids/outra'))).toBeNull()
    // Falha também espera o próximo ciclo.
    expect(gw.calls.redirects).toBe(1)
    now += 61_000
    gw.setRedirectResult(200, LIST)
    await redirects.lookup(new URL('http://f/kids/vilao-em-aliado'))
    await Bun.sleep(1)
    expect(await redirects.lookup(new URL('http://f/kids/vilao-em-aliado'))).toBe('/i/guia-pais')
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

describe('uma página por curso', () => {
  test('o presente do curso abre na página dele, qualquer que seja a oferta do presente', async () => {
    const { funnelForGiftCourse } = await import('../../src/funnels/registry')
    expect(funnelForGiftCourse('cade-todo-mundo', 'kids')?.key).toBe('kids/cade-todo-mundo')
    expect(funnelForGiftCourse('cade-todo-mundo-adulto', 'adult')?.key).toBe('pro/cade-todo-mundo')
    expect(funnelForGiftCourse('transformando-o-vilao-em-aliado', 'kids')?.key).toBe(
      'kids/vilao-em-aliado',
    )
    expect(funnelForGiftCourse('desafio-primeiro-jogo-adulto', 'adult')?.key).toBe(
      'pro/desafio-primeiro-jogo',
    )
    expect(funnelForGiftCourse('cade-todo-mundo', 'adult')).toBeNull()
    expect(funnelForGiftCourse('curso-sem-pagina', 'kids')).toBeNull()
  })
})

import { describe, expect, test } from 'bun:test'
import { AcquisitionReportsService } from '../../src/application/acquisitions/acquisition-reports.service'
import { AmbassadorOffersService } from '../../src/application/ambassador-offers/ambassador-offers.service'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { CampaignAdminService } from '../../src/application/campaigns/campaign-admin.service'
import { CreateInviteService } from '../../src/application/invites/create-invite.service'
import { ReferralLinkService } from '../../src/application/links/referral-link.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import type { AmbassadorOfferRepository } from '../../src/domain/ports/ambassador-offer-repository.port'
import { createServer } from '../../src/interfaces/http/server'
import { InMemoryAcquisitionRepository } from '../fakes/acquisitions'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import {
  FakeGiftOfferCatalog,
  FakeReferralsGateway,
  InMemoryReferralRepository,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

const TOKEN = 'internal-token-32-chars-ok-xxxxx'
const FUNNEL_URL = 'https://sistemazero.com.br'
const DAY = 86_400_000
const DESAFIO = {
  ...KIDS_GIFT_OFFER,
  offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d11',
  offerSlug: 'desafio-primeiro-jogo-30-dias',
  name: 'Desafio do Primeiro Jogo',
}

class MemoryLists implements AmbassadorOfferRepository {
  rows: Awaited<ReturnType<AmbassadorOfferRepository['list']>> = []
  async list(audience: 'kids' | 'adult', kind?: 'gift' | 'referral') {
    return this.rows.filter((r) => r.audience === audience && (!kind || r.kind === kind))
  }
  async replace(
    audience: 'kids' | 'adult',
    kind: 'gift' | 'referral',
    items: { offerId: string; enabled: boolean }[],
  ) {
    this.rows = this.rows.filter((r) => !(r.audience === audience && r.kind === kind))
    for (const [position, item] of items.entries())
      this.rows.push({ audience, kind, ...item, position, updatedAt: new Date().toISOString() })
    return this.list(audience, kind)
  }
}

function buildApp() {
  const repo = new InMemoryReferralRepository()
  const gateway = new FakeReferralsGateway()
  const campaignRepo = new InMemoryCampaignRepository(repo)
  const acquisitions = new InMemoryAcquisitionRepository(repo)
  const catalog = new FakeGiftOfferCatalog()
  catalog.add(DESAFIO)
  const reports = new AcquisitionReportsService(acquisitions, campaignRepo, repo)
  const campaigns = new CampaignAdminService(
    campaignRepo,
    repo,
    FUNNEL_URL,
    undefined,
    undefined,
    catalog,
    reports,
  )
  const ambassadorOffers = new AmbassadorOffersService(new MemoryLists(), catalog, silentLogger)
  const links = new ReferralLinkService(repo, campaignRepo, catalog, ambassadorOffers)
  const app = createServer({
    logger: silentLogger,
    repo,
    redeem: new RedeemScholarshipService(
      repo,
      gateway,
      {
        giftOffers: catalog,
        kidsCommunityUrl: 'https://kids.sistemazero.com.br',
        communityUrl: null,
        leaseMs: 90_000,
        campaigns: campaignRepo,
        ambassadorOffers,
      },
      silentLogger,
    ),
    invite: new CreateInviteService(
      repo,
      gateway,
      { funnelPublicUrl: FUNNEL_URL, dailyLimit: 50, adultGiftEnabled: false, ambassadorOffers },
      silentLogger,
    ),
    ambassadors: new AmbassadorAdminService(
      repo,
      gateway,
      { funnelPublicUrl: FUNNEL_URL, adultGiftEnabled: false },
      silentLogger,
    ),
    campaigns,
    ambassadorOffers,
    links,
    reports,
    funnelPublicUrl: FUNNEL_URL,
    bonusAmountCents: 3000,
    requireAdminEnabled: true,
    internalToken: TOKEN,
    readiness: async () => {},
  })
  return { app, repo, campaigns, gateway }
}

const admin = (role = 'admin') => ({
  'x-internal-token': TOKEN,
  'x-auth-user-role': role,
  'x-auth-user-status': 'active',
  'x-auth-user-id': 'admin-1',
  'x-auth-user-name': 'Helena',
  'content-type': 'application/json',
})
const get = (path: string, headers: Record<string, string>) =>
  new Request(`http://referrals${path}`, { headers })

describe('rotas da origem por aquisição', () => {
  test('listas: staff lê, só admin grava; presente de assinatura volta 400', async () => {
    const { app } = buildApp()
    const put = (role: string, body: unknown) =>
      app.handle(
        new Request('http://referrals/referrals/admin/ambassador-offers', {
          method: 'PUT',
          headers: admin(role),
          body: JSON.stringify(body),
        }),
      )
    const body = {
      audience: 'kids',
      kind: 'referral',
      items: [{ offerId: DESAFIO.offerId, enabled: true }],
    }
    expect((await put('staff', body)).status).toBe(403)
    expect((await put('admin', body)).status).toBe(200)
    const read = await app.handle(
      get('/referrals/admin/ambassador-offers?audience=kids', admin('staff')),
    )
    expect(read.status).toBe(200)
    expect(((await read.json()) as { referral: unknown[] }).referral).toHaveLength(1)
  })

  test('link do embaixador: 404 uniforme para código inexistente e oferta fora da lista', async () => {
    const { app, repo } = buildApp()
    await repo.createAmbassadorWithCode({
      name: 'Mariana',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    const internal = { 'x-internal-token': TOKEN }
    const ok = await app.handle(get('/referrals/internal/links/MARI-X7K2', internal))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ mode: 'gift', sourceKind: 'ambassador' })
    expect((await app.handle(get('/referrals/internal/links/nada-0000', internal))).status).toBe(
      404,
    )
    expect(
      (
        await app.handle(
          get('/referrals/internal/links/mari-x7k2/desafio-primeiro-jogo-30-dias', internal),
        )
      ).status,
    ).toBe(404)
    expect(
      (await app.handle(get('/referrals/internal/links/mari-x7k2/desafio/outro', internal))).status,
    ).toBe(404)
    expect((await app.handle(get('/referrals/internal/links/mari-x7k2', {}))).status).toBe(401)
  })

  test('link curto por produto: ?product=&kind= acha a oferta da lista; query torta é 422', async () => {
    const { app, repo } = buildApp()
    await repo.createAmbassadorWithCode({
      name: 'Mariana',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    const internal = { 'x-internal-token': TOKEN }
    // Sem oferta do produto na lista de indicação: 404 uniforme.
    expect(
      (
        await app.handle(
          get(
            '/referrals/internal/links/mari-x7k2?product=cade-todo-mundo&kind=referral',
            internal,
          ),
        )
      ).status,
    ).toBe(404)
    expect(
      (await app.handle(get('/referrals/internal/links/mari-x7k2?product=Nada%20Disso', internal)))
        .status,
    ).toBeGreaterThanOrEqual(400)
  })

  test('endereço antigo: ativo devolve o link da campanha; sem campanha, 404', async () => {
    const { app, campaigns } = buildApp()
    const now = Date.now()
    await campaigns.create(
      {
        name: 'Guia dos pais',
        publicTitle: 'Guia dos pais',
        description: '',
        context: 'event',
        code: 'guia-pais-presente',
        startsAt: new Date(now - DAY).toISOString(),
        endsAt: new Date(now + 30 * DAY).toISOString(),
        status: 'active',
        channel: 'whatsapp',
        giftOfferId: KIDS_GIFT_OFFER.offerId,
        redirectPath: '/kids/vilao-em-aliado',
        redirectUntil: new Date(now + 30 * DAY).toISOString(),
      },
      'Helena',
    )
    const internal = { 'x-internal-token': TOKEN }
    const hit = await app.handle(
      get('/referrals/internal/redirects?path=/kids/vilao-em-aliado', internal),
    )
    expect(hit.status).toBe(200)
    expect(((await hit.json()) as { url: string }).url).toBe(`${FUNNEL_URL}/i/guia-pais-presente`)
    expect(
      (await app.handle(get('/referrals/internal/redirects?path=/kids/outra', internal))).status,
    ).toBe(404)
    // Sem `path`: a lista dos ativos, que o funil guarda por um minuto.
    const list = await (await app.handle(get('/referrals/internal/redirects', internal))).json()
    expect((list as { items: unknown[] }).items).toEqual([
      expect.objectContaining({
        path: '/kids/vilao-em-aliado',
        url: `${FUNNEL_URL}/i/guia-pais-presente`,
      }),
    ])
  })

  test('Origem das vendas: admin lê, staff não; período maior que um ano é 400', async () => {
    const { app } = buildApp()
    expect((await app.handle(get('/referrals/admin/origins', admin('staff')))).status).toBe(403)
    const ok = await app.handle(get('/referrals/admin/origins?audience=kids', admin()))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toHaveProperty('totals')
    const from = new Date(Date.now() - 400 * DAY).toISOString()
    expect(
      (await app.handle(get(`/referrals/admin/origins?from=${encodeURIComponent(from)}`, admin())))
        .status,
    ).toBe(400)
    expect(
      (await app.handle(get('/referrals/admin/acquisitions?email=paula@example.com', admin())))
        .status,
    ).toBe(200)
  })

  test('lista de campanhas: equipe vê as quantidades, só admin vê o faturamento', async () => {
    const { app, campaigns } = buildApp()
    const now = Date.now()
    await campaigns.create(
      {
        name: 'Feira',
        publicTitle: 'Feira',
        description: '',
        context: 'event',
        code: 'feira-dezembro',
        startsAt: new Date(now - DAY).toISOString(),
        endsAt: new Date(now + DAY).toISOString(),
        status: 'active',
        channel: 'evento',
        giftOfferId: KIDS_GIFT_OFFER.offerId,
      },
      'Helena',
    )
    const read = async (role: string) => {
      const response = await app.handle(get('/referrals/admin/campaigns', admin(role)))
      const body = (await response.json()) as {
        items: { results: { revenueCents: string | null } }[]
      }
      return body.items[0]!.results
    }
    expect((await read('staff')).revenueCents).toBeNull()
    expect((await read('admin')).revenueCents).toBe('0')
  })

  test('campanha de VENDA não abre presente: código e resgate respondem 404', async () => {
    const { app, campaigns } = buildApp()
    const now = Date.now()
    await campaigns.create(
      {
        name: 'Venda do Desafio',
        publicTitle: 'Desafio',
        description: '',
        context: 'ad',
        code: 'venda-desafio',
        startsAt: new Date(now - DAY).toISOString(),
        endsAt: new Date(now + DAY).toISOString(),
        status: 'active',
        channel: 'instagram',
        kind: 'sale',
        saleOfferId: DESAFIO.offerId,
        linkTarget: 'page',
      },
      'Helena',
    )
    const internal = { 'x-internal-token': TOKEN }
    expect(
      (await app.handle(get('/referrals/internal/codes/venda-desafio', internal))).status,
    ).toBe(404)
    const redeem = await app.handle(
      new Request('http://referrals/referrals/internal/redemptions', {
        method: 'POST',
        headers: { ...internal, 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'venda-desafio', name: 'Paula', email: 'paula@example.com' }),
      }),
    )
    expect(redeem.status).toBe(404)
  })

  test('presente escolhido pelo embaixador: só o que está ligado na lista do público', async () => {
    const { app, repo } = buildApp()
    await repo.createAmbassadorWithCode({
      name: 'Mariana',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    const put = await app.handle(
      new Request('http://referrals/referrals/admin/ambassador-offers', {
        method: 'PUT',
        headers: admin(),
        body: JSON.stringify({
          audience: 'kids',
          kind: 'gift',
          items: [{ offerId: DESAFIO.offerId, enabled: true }],
        }),
      }),
    )
    expect(put.status).toBe(200)
    const internal = { 'x-internal-token': TOKEN }
    const chosen = await app.handle(
      get(`/referrals/internal/codes/mari-x7k2?offer=${DESAFIO.offerSlug}`, internal),
    )
    expect(chosen.status).toBe(200)
    expect(((await chosen.json()) as { gift: { offerSlug: string } }).gift.offerSlug).toBe(
      DESAFIO.offerSlug,
    )
    expect(
      (await app.handle(get('/referrals/internal/codes/mari-x7k2?offer=fora-da-lista', internal)))
        .status,
    ).toBe(404)
  })

  test('convite por oferta: indicação da lista sai no template da oferta; fora da lista, 404', async () => {
    const { app, repo, gateway } = buildApp()
    await repo.createAmbassadorWithCode({
      name: 'Mariana Lopes',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    await app.handle(
      new Request('http://referrals/referrals/admin/ambassador-offers', {
        method: 'PUT',
        headers: admin(),
        body: JSON.stringify({
          audience: 'kids',
          kind: 'referral',
          items: [{ offerId: DESAFIO.offerId, enabled: true }],
        }),
      }),
    )
    const invite = (offer: string) =>
      app.handle(
        new Request(
          `http://referrals/referrals/internal/ambassadors/by-token/${'m'.repeat(43)}/invites`,
          {
            method: 'POST',
            headers: { 'x-internal-token': TOKEN, 'content-type': 'application/json' },
            body: JSON.stringify({
              name: 'Paula',
              email: 'paula@example.com',
              offer,
              kind: 'referral',
            }),
          },
        ),
      )
    expect((await invite('fora-da-lista')).status).toBe(404)
    expect((await invite(DESAFIO.offerSlug)).status).toBe(202)
    const sent = gateway.calls.find((c) => c.kind === 'sendEmail') as unknown as {
      input: { templateKey: string; variables: Record<string, string> }
    }
    expect(sent.input.templateKey).toBe('referrals-offer-referral-invite')
    expect(sent.input.variables).toMatchObject({
      oferta: DESAFIO.name,
      // O tipo vai no link (27/11/2026): a oferta única de um curso pode ser venda e presente.
      link: `${FUNNEL_URL}/i/mari-x7k2/${DESAFIO.offerSlug}?tipo=indicacao`,
    })
  })

  test('presente do Cadê escolhido: o e-mail aprovado de sempre, com a oferta escolhida no link', async () => {
    const { app, repo, gateway } = buildApp()
    await repo.createAmbassadorWithCode({
      name: 'Mariana Lopes',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    await app.handle(
      new Request('http://referrals/referrals/admin/ambassador-offers', {
        method: 'PUT',
        headers: admin(),
        body: JSON.stringify({
          audience: 'kids',
          kind: 'gift',
          items: [{ offerId: KIDS_GIFT_OFFER.offerId, enabled: true }],
        }),
      }),
    )
    const res = await app.handle(
      new Request(
        `http://referrals/referrals/internal/ambassadors/by-token/${'m'.repeat(43)}/invites`,
        {
          method: 'POST',
          headers: { 'x-internal-token': TOKEN, 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Paula',
            email: 'paula@example.com',
            offer: KIDS_GIFT_OFFER.offerSlug,
            kind: 'gift',
          }),
        },
      ),
    )
    expect(res.status).toBe(202)
    const sent = gateway.calls.find((c) => c.kind === 'sendEmail') as unknown as {
      input: { templateKey: string; variables: Record<string, string> }
    }
    expect(sent.input.templateKey).toBe('referrals-scholarship-invite')
    expect(sent.input.variables.link).toBe(
      `${FUNNEL_URL}/i/mari-x7k2/${KIDS_GIFT_OFFER.offerSlug}?tipo=presente`,
    )
  })
})

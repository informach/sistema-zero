import { describe, expect, test } from 'bun:test'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { CampaignAdminService } from '../../src/application/campaigns/campaign-admin.service'
import { CreateInviteService } from '../../src/application/invites/create-invite.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import { createServer } from '../../src/interfaces/http/server'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const INTERNAL_TOKEN = 'internal-token-32-chars-ok-xxxxx'
const METRICS_TOKEN = 'metrics-token-32-chars-okay-xxxx'
const FUNNEL_URL = 'https://sistemazero.com.br'

function buildApp(
  opts: { internalToken?: string; metricsToken?: string; communityUrl?: string | null } = {},
) {
  const repo = new InMemoryReferralRepository()
  const gateway = new FakeReferralsGateway()
  const campaignRepo = new InMemoryCampaignRepository(repo)
  const campaigns = new CampaignAdminService(campaignRepo, repo, FUNNEL_URL)
  const redeem = new RedeemScholarshipService(
    repo,
    gateway,
    {
      courseSlug: 'cade-todo-mundo',
      kidsCommunityUrl: 'https://kids.sistemazero.com.br',
      communityUrl: opts.communityUrl ?? null,
      leaseMs: 90_000,
      campaigns: campaignRepo,
    },
    silentLogger,
  )
  const invite = new CreateInviteService(
    repo,
    gateway,
    { funnelPublicUrl: FUNNEL_URL, dailyLimit: 50, adultGiftEnabled: Boolean(opts.communityUrl) },
    silentLogger,
  )
  const ambassadors = new AmbassadorAdminService(
    repo,
    gateway,
    { funnelPublicUrl: FUNNEL_URL, adultGiftEnabled: Boolean(opts.communityUrl) },
    silentLogger,
  )
  const app = createServer({
    logger: silentLogger,
    repo,
    redeem,
    invite,
    ambassadors,
    campaigns,
    funnelPublicUrl: FUNNEL_URL,
    bonusAmountCents: 3000,
    requireAdminEnabled: true,
    internalToken: opts.internalToken,
    metricsToken: opts.metricsToken,
    readiness: async () => {},
  })
  return { app, repo, gateway }
}

const ADMIN_HEADERS = {
  'x-internal-token': INTERNAL_TOKEN,
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}

describe('campanhas no HTTP', () => {
  test('retomada fora dos sete dias informa vencimento, sem nova concessão', async () => {
    const { app, repo, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
    await repo.createAmbassadorWithCode({
      name: 'Pessoa',
      email: 'pessoa@example.com',
      code: 'convite-teste',
      pageToken: 't'.repeat(43),
    })
    gateway.grantResult = { status: 502, body: {} }
    const body = JSON.stringify({
      code: 'convite-teste',
      name: 'Responsável',
      email: 'mae@example.com',
    })
    await app.handle(
      req('/referrals/internal/redemptions', { method: 'POST', headers: ADMIN_HEADERS, body }),
    )
    repo.redemptions[0]!.createdAt = new Date(Date.now() - 8 * 86_400_000)
    gateway.grantResult = { status: 200, body: {} }
    const result = await app.handle(
      req('/referrals/internal/redemptions', { method: 'POST', headers: ADMIN_HEADERS, body }),
    )
    expect(result.status).toBe(410)
    expect(await result.json()).toMatchObject({ error: { code: 'GIFT_EXPIRED' } })
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(1)
  })
  const input = {
    name: 'Ação de outubro',
    publicTitle: 'Um presente para sua família',
    description: '',
    context: 'event',
    code: 'evento-outubro',
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2099-01-01T00:00:00Z',
    status: 'draft',
    channel: 'palestra',
  }
  test('admin cria sem e-mail; staff lê, mas não escreve; rascunho é privado', async () => {
    const { app, repo } = buildApp({ internalToken: INTERNAL_TOKEN })
    const denied = await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: { ...ADMIN_HEADERS, 'x-auth-user-role': 'staff' },
        body: JSON.stringify(input),
      }),
    )
    expect(denied.status).toBe(403)
    const created = await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
          'x-auth-user-name': 'A'.repeat(200),
          'x-auth-user-id': 'admin-id-auditavel',
        },
        body: JSON.stringify(input),
      }),
    )
    expect(created.status).toBe(201)
    const { campaign } = (await created.json()) as {
      campaign: { id: string; code: string; updatedAt: string }
    }
    expect(repo.ambassadors).toHaveLength(0)
    const detail = await app.handle(
      req(`/referrals/admin/campaigns/${campaign.id}`, { headers: ADMIN_HEADERS }),
    )
    expect(await detail.json()).toMatchObject({
      history: [{ actor: `${'A'.repeat(100)} (admin-id-auditavel)` }],
    })
    const hidden = await app.handle(
      req(`/referrals/internal/codes/${campaign.code}`, {
        headers: { 'x-internal-token': INTERNAL_TOKEN },
      }),
    )
    expect(hidden.status).toBe(404)
    const listed = await app.handle(
      req('/referrals/admin/campaigns', {
        headers: { ...ADMIN_HEADERS, 'x-auth-user-role': 'staff' },
      }),
    )
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({ total: 1 })
    const updated = await app.handle(
      req(`/referrals/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...input, status: 'active', expectedUpdatedAt: campaign.updatedAt }),
      }),
    )
    expect(updated.status).toBe(200)
    const stale = await app.handle(
      req(`/referrals/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...input, status: 'ended', expectedUpdatedAt: campaign.updatedAt }),
      }),
    )
    expect(stale.status).toBe(409)
    expect(await stale.json()).toMatchObject({ error: { code: 'CAMPAIGN_CHANGED' } })
    const publicPage = await app.handle(
      req(`/referrals/internal/codes/${campaign.code}`, {
        headers: { 'x-internal-token': INTERNAL_TOKEN },
      }),
    )
    expect(await publicPage.json()).toMatchObject({
      state: 'active',
      source: { kind: 'campaign', name: input.publicTitle },
      giftAvailable: true,
    })
  })
  test('datas inválidas retornam 400 e encerramento retorna 410 antes de criar conta', async () => {
    const { app, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
    const bad = await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...input, endsAt: input.startsAt }),
      }),
    )
    expect(bad.status).toBe(400)
    await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...input, status: 'ended' }),
      }),
    )
    const result = await app.handle(
      req('/referrals/internal/redemptions', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ code: input.code, name: 'Responsável', email: 'mae@example.com' }),
      }),
    )
    expect(result.status).toBe(410)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })
})

function req(path: string, init: RequestInit = {}) {
  return new Request(`http://referrals.local${path}`, init)
}

describe('borda HTTP do referrals', () => {
  describe('rotas me (auto-cadastro do responsável)', () => {
    test('sessão de PERFIL (criança) é RECUSADA: embaixador é da Área dos pais', async () => {
      const { app, repo } = buildApp({ internalToken: INTERNAL_TOKEN })
      // Perfil kids: user-id = perfil; account-id = a CONTA do responsável. A
      // presença do account-id é o marcador da sessão de perfil.
      const profileHeaders = {
        'x-internal-token': INTERNAL_TOKEN,
        'x-auth-user-id': '11111111-1111-4111-8111-111111111111',
        'x-auth-account-id': '22222222-2222-4222-8222-222222222222',
        'x-auth-user-email': 'mae@example.com',
      }
      const post = await app.handle(
        req('/referrals/me/ambassador', { method: 'POST', headers: profileHeaders }),
      )
      expect(post.status).toBe(403)
      const get = await app.handle(req('/referrals/me/ambassador', { headers: profileHeaders }))
      expect(get.status).toBe(403)
      expect(repo.ambassadors).toHaveLength(0)

      // A sessão da CONTA (sem account-id) cadastra normalmente.
      const ok = await app.handle(
        req('/referrals/me/ambassador', {
          method: 'POST',
          headers: {
            'x-internal-token': INTERNAL_TOKEN,
            'x-auth-user-id': '22222222-2222-4222-8222-222222222222',
            'x-auth-user-email': 'mae@example.com',
            'x-auth-user-name': encodeURIComponent('Maria José'),
          },
        }),
      )
      expect(ok.status).toBe(201)
      const body = (await ok.json()) as {
        enrolled: boolean
        created: boolean
        bonus: { amountCents: number }
        ambassador: { pageUrl: string }
      }
      expect(body.enrolled).toBe(true)
      expect(body.created).toBe(true)
      expect(body.bonus.amountCents).toBe(3000)
      expect(body.ambassador.pageUrl.startsWith(`${FUNNEL_URL}/embaixador/`)).toBe(true)
      expect(repo.ambassadors[0]!.accountUserId).toBe('22222222-2222-4222-8222-222222222222')
    })

    test('e-mail que já é embaixador NÃO é vinculado: link vai p/ a caixa do dono', async () => {
      const { app, repo, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
      // Embaixador criado pelo admin (sem conta) — o caso do sequestro.
      await repo.createAmbassadorWithCode({
        name: 'Vó Cida',
        email: 'cida@example.com',
        pageToken: 'z'.repeat(43),
        code: 'cida-x7k2',
      })
      const before = gateway.callsOf('sendEmail').length

      const res = await app.handle(
        req('/referrals/me/ambassador', {
          method: 'POST',
          headers: {
            'x-internal-token': INTERNAL_TOKEN,
            'x-auth-user-id': '33333333-3333-4333-8333-333333333333',
            'x-auth-user-email': 'cida@example.com',
          },
        }),
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as { enrolled: boolean; emailPending?: boolean }
      expect(body.enrolled).toBe(false)
      expect(body.emailPending).toBe(true)
      expect(JSON.stringify(body)).not.toContain('/embaixador/')
      expect(repo.ambassadors[0]!.accountUserId).toBeNull()
      expect(gateway.callsOf('sendEmail').length).toBe(before + 1)
    })

    test('re-POST da mesma conta é retomada: created false e nenhum e-mail novo prometido', async () => {
      const { app, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
      const headers = {
        'x-internal-token': INTERNAL_TOKEN,
        'x-auth-user-id': '33333333-3333-4333-8333-333333333333',
        'x-auth-user-email': 'pai@example.com',
      }
      await app.handle(req('/referrals/me/ambassador', { method: 'POST', headers }))
      const emailsAfterCreate = gateway.callsOf('sendEmail').length
      const again = await app.handle(req('/referrals/me/ambassador', { method: 'POST', headers }))
      expect(again.status).toBe(200)
      const body = (await again.json()) as { created: boolean }
      expect(body.created).toBe(false)
      expect(gateway.callsOf('sendEmail').length).toBe(emailsAfterCreate)
    })

    test('sessão de SUPORTE (impersonação): GET sem links nem código; POST recusado', async () => {
      const { app, repo, gateway } = buildApp({
        internalToken: INTERNAL_TOKEN,
        communityUrl: 'https://comunidade.sistemazero.com.br',
      })
      const own = {
        'x-internal-token': INTERNAL_TOKEN,
        'x-auth-user-id': '44444444-4444-4444-8444-444444444444',
        'x-auth-user-email': 'tia@example.com',
      }
      const support = { ...own, 'x-auth-impersonator-id': '55555555-5555-4555-8555-555555555555' }

      const blocked = await app.handle(
        req('/referrals/me/ambassador', { method: 'POST', headers: support }),
      )
      expect(blocked.status).toBe(403)
      expect(repo.ambassadors).toHaveLength(0)
      expect(gateway.callsOf('sendEmail')).toHaveLength(0)

      await app.handle(req('/referrals/me/ambassador', { method: 'POST', headers: own }))
      const codesBefore = repo.codes.length
      const get = await app.handle(req('/referrals/me/ambassador', { headers: support }))
      expect(get.status).toBe(200)
      const body = (await get.json()) as {
        enrolled: boolean
        ambassador: Record<string, unknown>
      }
      expect(body.enrolled).toBe(true)
      expect(body.ambassador).toMatchObject({
        code: null,
        pageUrl: null,
        shareUrl: null,
        shareUrls: { kids: null, adult: null },
      })
      expect(JSON.stringify(body)).not.toContain('/embaixador/')
      expect(JSON.stringify(body)).not.toContain('/bolsa/')
      // O GET da equipe não cria o código adulto.
      expect(repo.codes.length).toBe(codesBefore)
    })
  })

  test('healthz e readyz respondem', async () => {
    const { app } = buildApp()
    expect((await app.handle(req('/healthz'))).status).toBe(200)
    expect((await app.handle(req('/readyz'))).status).toBe(200)
  })

  test('metrics exige token quando configurado', async () => {
    const { app } = buildApp({ metricsToken: METRICS_TOKEN })
    expect((await app.handle(req('/metrics'))).status).toBe(401)
    const ok = await app.handle(req('/metrics', { headers: { 'x-metrics-token': METRICS_TOKEN } }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ redemptionsByStatus: {} })
  })

  describe('rotas admin', () => {
    test('sem x-internal-token → 401; sem role → 401; staff em escrita → 403', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const body = JSON.stringify({ name: 'Vó Cida', email: 'cida@example.com' })

      const noToken = await app.handle(
        req('/referrals/admin/ambassadors', {
          method: 'POST',
          body,
          headers: { 'content-type': 'application/json' },
        }),
      )
      expect(noToken.status).toBe(401)

      const noRole = await app.handle(
        req('/referrals/admin/ambassadors', {
          method: 'POST',
          body,
          headers: { 'x-internal-token': INTERNAL_TOKEN, 'content-type': 'application/json' },
        }),
      )
      expect(noRole.status).toBe(401)

      const staffWrite = await app.handle(
        req('/referrals/admin/ambassadors', {
          method: 'POST',
          body,
          headers: { ...ADMIN_HEADERS, 'x-auth-user-role': 'staff' },
        }),
      )
      expect(staffWrite.status).toBe(403)

      // staff LÊ normalmente.
      const staffRead = await app.handle(
        req('/referrals/admin/ambassadors', {
          headers: { ...ADMIN_HEADERS, 'x-auth-user-role': 'staff' },
        }),
      )
      expect(staffRead.status).toBe(200)
    })

    test('cria embaixador (201), lista, detalha, 409 no e-mail repetido', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const body = JSON.stringify({ name: 'Vó Cida', email: 'cida@example.com' })

      const created = await app.handle(
        req('/referrals/admin/ambassadors', { method: 'POST', body, headers: ADMIN_HEADERS }),
      )
      expect(created.status).toBe(201)
      const payload = (await created.json()) as {
        ambassador: { id: string; code: string }
        emailSent: boolean
      }
      expect(payload.ambassador.code).toMatch(/^vo-/) // slug do 1º nome
      expect(payload.emailSent).toBe(true)

      const list = await app.handle(req('/referrals/admin/ambassadors', { headers: ADMIN_HEADERS }))
      expect(((await list.json()) as { total: number }).total).toBe(1)

      const detail = await app.handle(
        req(`/referrals/admin/ambassadors/${payload.ambassador.id}`, { headers: ADMIN_HEADERS }),
      )
      expect(detail.status).toBe(200)

      const dup = await app.handle(
        req('/referrals/admin/ambassadors', { method: 'POST', body, headers: ADMIN_HEADERS }),
      )
      expect(dup.status).toBe(409)
    })

    test('corpo inválido → 400 com envelope FIXO (não ecoa o input)', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const res = await app.handle(
        req('/referrals/admin/ambassadors', {
          method: 'POST',
          body: JSON.stringify({ name: 'x', email: 'nao-e-email' }),
          headers: ADMIN_HEADERS,
        }),
      )
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(JSON.stringify(body)).not.toContain('nao-e-email')
    })
  })

  describe('rotas internal (funil)', () => {
    async function seed(app: ReturnType<typeof buildApp>['app']) {
      const created = await app.handle(
        req('/referrals/admin/ambassadors', {
          method: 'POST',
          body: JSON.stringify({ name: 'Vó Cida', email: 'cida@example.com' }),
          headers: ADMIN_HEADERS,
        }),
      )
      return (await created.json()) as { ambassador: { id: string; code: string; pageUrl: string } }
    }

    test('resolve código ativo; 404 UNIFORME p/ inexistente e desativado', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const { ambassador } = await seed(app)
      const headers = { 'x-internal-token': INTERNAL_TOKEN }

      const ok = await app.handle(req(`/referrals/internal/codes/${ambassador.code}`, { headers }))
      expect(ok.status).toBe(200)
      expect(await ok.json()).toEqual({
        code: ambassador.code,
        ownerKind: 'ambassador',
        displayName: 'Vó Cida',
        giftAvailable: true,
        source: { kind: 'ambassador', name: 'Vó Cida' },
        state: 'active',
        startsAt: null,
        endsAt: null,
        audience: 'kids',
      })

      const missing = await app.handle(req('/referrals/internal/codes/nao-existe', { headers }))
      expect(missing.status).toBe(404)

      await app.handle(
        req(`/referrals/admin/ambassadors/${ambassador.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'disabled' }),
          headers: ADMIN_HEADERS,
        }),
      )
      const disabled = await app.handle(
        req(`/referrals/internal/codes/${ambassador.code}`, { headers }),
      )
      expect(disabled.status).toBe(404)
      expect(await disabled.json()).toEqual(await missing.json()) // mesmíssimo envelope
    })

    test('curso em preparação aparece no link e recusa resgate antes de criar conta', async () => {
      const { app, repo, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
      const { ambassador } = await seed(app)
      gateway.availabilityResult = { status: 200, body: { available: false } }
      const headers = { 'x-internal-token': INTERNAL_TOKEN, 'content-type': 'application/json' }

      const page = await app.handle(
        req(`/referrals/internal/codes/${ambassador.code}`, { headers }),
      )
      expect(page.status).toBe(200)
      expect(await page.json()).toMatchObject({ giftAvailable: false })

      const res = await app.handle(
        req('/referrals/internal/redemptions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            code: ambassador.code,
            name: 'Paula Prado',
            email: 'paula@example.com',
          }),
        }),
      )
      expect(res.status).toBe(503)
      expect(await res.json()).toMatchObject({ error: { code: 'GIFT_UNAVAILABLE' } })
      expect(repo.redemptions).toHaveLength(0)
      expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
    })

    test('resgate ponta a ponta: 201 completed; repetir o e-mail → 409', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const { ambassador } = await seed(app)
      const headers = { 'x-internal-token': INTERNAL_TOKEN, 'content-type': 'application/json' }

      const redeem = await app.handle(
        req('/referrals/internal/redemptions', {
          method: 'POST',
          body: JSON.stringify({
            code: ambassador.code,
            name: 'Paula Prado',
            email: 'paula@example.com',
          }),
          headers,
        }),
      )
      expect(redeem.status).toBe(201)
      expect(await redeem.json()).toEqual({
        status: 'completed',
        expiresAt: expect.any(String),
        emailStatus: 'accepted',
        muralAccess: 'trial',
      })

      const again = await app.handle(
        req('/referrals/internal/redemptions', {
          method: 'POST',
          body: JSON.stringify({
            code: ambassador.code,
            name: 'Paula Prado',
            email: 'paula@example.com',
          }),
          headers,
        }),
      )
      expect(again.status).toBe(409)
    })

    test('página do embaixador por token + convite por e-mail (202)', async () => {
      const { app } = buildApp({ internalToken: INTERNAL_TOKEN })
      const { ambassador } = await seed(app)
      const token = ambassador.pageUrl.split('/embaixador/')[1]!
      const headers = { 'x-internal-token': INTERNAL_TOKEN, 'content-type': 'application/json' }

      const page = await app.handle(
        req(`/referrals/internal/ambassadors/by-token/${token}`, { headers }),
      )
      expect(page.status).toBe(200)
      const view = (await page.json()) as { name: string; shareUrl: string }
      expect(view.name).toBe('Vó Cida')
      expect(view.shareUrl).toBe(`${FUNNEL_URL}/bolsa/${ambassador.code}`)

      const invite = await app.handle(
        req(`/referrals/internal/ambassadors/by-token/${token}/invites`, {
          method: 'POST',
          body: JSON.stringify({ name: 'Paula', email: 'paula@example.com' }),
          headers,
        }),
      )
      expect(invite.status).toBe(202)

      const dup = await app.handle(
        req(`/referrals/internal/ambassadors/by-token/${token}/invites`, {
          method: 'POST',
          body: JSON.stringify({ name: 'Paula', email: 'paula@example.com' }),
          headers,
        }),
      )
      expect(dup.status).toBe(409)
    })
  })
})

describe('presente Kids e adulto no HTTP (20/10/2026)', () => {
  const COMMUNITY = 'https://comunidade.sistemazero.com.br'
  const headers = { 'x-internal-token': INTERNAL_TOKEN, 'content-type': 'application/json' }

  async function seedAmbassador(app: ReturnType<typeof buildApp>['app']) {
    const created = await app.handle(
      req('/referrals/admin/ambassadors', {
        method: 'POST',
        body: JSON.stringify({ name: 'Marta Lima', email: 'marta@example.com' }),
        headers: ADMIN_HEADERS,
      }),
    )
    const { ambassador } = (await created.json()) as {
      ambassador: { id: string; code: string; pageUrl: string }
    }
    return { ...ambassador, token: ambassador.pageUrl.split('/embaixador/')[1]! }
  }

  test('by-token: shareUrl Kids de sempre + shareUrls; o código adulto nasce uma vez', async () => {
    const { app, repo } = buildApp({ internalToken: INTERNAL_TOKEN, communityUrl: COMMUNITY })
    const ambassador = await seedAmbassador(app)
    const first = await app.handle(
      req(`/referrals/internal/ambassadors/by-token/${ambassador.token}`, { headers }),
    )
    expect(first.status).toBe(200)
    const view = (await first.json()) as {
      shareUrl: string
      shareUrls: { kids: string; adult: string }
    }
    const adultCode = repo.codes.find((c) => c.audience === 'adult')!
    expect(view.shareUrl).toBe(`${FUNNEL_URL}/bolsa/${ambassador.code}`)
    expect(view.shareUrls).toEqual({
      kids: `${FUNNEL_URL}/bolsa/${ambassador.code}`,
      adult: `${FUNNEL_URL}/bolsa/${adultCode.code}`,
    })
    await app.handle(
      req(`/referrals/internal/ambassadors/by-token/${ambassador.token}`, { headers }),
    )
    expect(repo.codes.filter((c) => c.audience === 'adult')).toHaveLength(1)

    // O código adulto resolve com o público e consulta o curso adulto.
    const code = await app.handle(req(`/referrals/internal/codes/${adultCode.code}`, { headers }))
    expect(await code.json()).toMatchObject({
      code: adultCode.code,
      audience: 'adult',
      giftAvailable: true,
      source: { kind: 'ambassador', name: 'Marta Lima' },
    })
  })

  test('sem COMMUNITY_URL: código adulto aparece indisponível e o resgate dá 503; Kids segue', async () => {
    const { app, repo, gateway } = buildApp({ internalToken: INTERNAL_TOKEN })
    const ambassador = await seedAmbassador(app)
    // O painel não mostra nem cria o link adulto enquanto o presente adulto está desligado.
    const panel = await app.handle(
      req(`/referrals/internal/ambassadors/by-token/${ambassador.token}`, { headers }),
    )
    expect(((await panel.json()) as { shareUrls: { adult: string | null } }).shareUrls.adult).toBe(
      null,
    )
    expect(repo.codes.filter((c) => c.audience === 'adult')).toHaveLength(0)
    // Código adulto criado quando o presente estava ligado continua fechado.
    const ensured = await repo.ensureAmbassadorCode({
      ambassadorId: ambassador.id,
      audience: 'adult',
      code: 'marta-ad77',
    })
    if (ensured?.kind !== 'ok') throw new Error('seed adulto')
    const adultCode = ensured.code

    const invite = await app.handle(
      req(`/referrals/internal/ambassadors/by-token/${ambassador.token}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', audience: 'adult' }),
      }),
    )
    expect(invite.status).toBe(503)
    expect(await invite.json()).toMatchObject({ error: { code: 'GIFT_UNAVAILABLE' } })

    const page = await app.handle(req(`/referrals/internal/codes/${adultCode.code}`, { headers }))
    expect(page.status).toBe(200)
    expect(await page.json()).toMatchObject({ audience: 'adult', giftAvailable: false })
    expect(gateway.callsOf('getGiftAvailability')).toHaveLength(0)

    const redeem = await app.handle(
      req('/referrals/internal/redemptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: adultCode.code, name: 'Ana Souza', email: 'ana@example.com' }),
      }),
    )
    expect(redeem.status).toBe(503)
    expect(await redeem.json()).toMatchObject({ error: { code: 'GIFT_UNAVAILABLE' } })

    const kids = await app.handle(
      req('/referrals/internal/redemptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: ambassador.code,
          name: 'Ana Souza',
          email: 'ana@example.com',
        }),
      }),
    )
    expect(kids.status).toBe(201)
  })

  test('mesmo e-mail resgata um Kids e um adulto; o 409 é por público', async () => {
    const { app, repo } = buildApp({ internalToken: INTERNAL_TOKEN, communityUrl: COMMUNITY })
    const ambassador = await seedAmbassador(app)
    await app.handle(
      req(`/referrals/internal/ambassadors/by-token/${ambassador.token}`, { headers }),
    )
    const adultCode = repo.codes.find((c) => c.audience === 'adult')!
    const redeem = (code: string) =>
      app.handle(
        req('/referrals/internal/redemptions', {
          method: 'POST',
          headers,
          body: JSON.stringify({ code, name: 'Ana Souza', email: 'ana@example.com' }),
        }),
      )
    expect((await redeem(ambassador.code)).status).toBe(201)
    expect((await redeem(adultCode.code)).status).toBe(201)
    const again = await redeem(adultCode.code)
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ error: { code: 'SCHOLARSHIP_ALREADY_REDEEMED' } })
  })

  test('convite com público: adulto 202 com o template adulto; público inválido 400', async () => {
    const { app, gateway } = buildApp({ internalToken: INTERNAL_TOKEN, communityUrl: COMMUNITY })
    const ambassador = await seedAmbassador(app)
    const path = `/referrals/internal/ambassadors/by-token/${ambassador.token}/invites`
    const ok = await app.handle(
      req(path, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', audience: 'adult' }),
      }),
    )
    expect(ok.status).toBe(202)
    const sent = gateway.callsOf('sendEmail').at(-1)!.input as { templateKey: string }
    expect(sent.templateKey).toBe('referrals-scholarship-invite-adult')
    const bad = await app.handle(
      req(path, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Ana', email: 'rui@example.com', audience: 'pro' }),
      }),
    )
    expect(bad.status).toBe(400)
  })

  test('me/ambassador devolve shareUrls', async () => {
    const { app } = buildApp({ internalToken: INTERNAL_TOKEN, communityUrl: COMMUNITY })
    const res = await app.handle(
      req('/referrals/me/ambassador', {
        method: 'POST',
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
          'x-auth-user-id': '33333333-3333-4333-8333-333333333333',
          'x-auth-user-email': 'adulto@example.com',
          'x-auth-user-name': encodeURIComponent('Ana Souza'),
        },
      }),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      ambassador: { shareUrl: string; shareUrls: { kids: string; adult: string } }
    }
    expect(body.ambassador.shareUrls.kids).toBe(body.ambassador.shareUrl)
    expect(body.ambassador.shareUrls.adult).toMatch(/\/bolsa\/ana-[a-z0-9]{4}$/)
    expect(body.ambassador.shareUrls.adult).not.toBe(body.ambassador.shareUrls.kids)
  })

  test('campanha: público no corpo; publicada recusa troca com 409 CAMPAIGN_AUDIENCE_LOCKED', async () => {
    const { app } = buildApp({ internalToken: INTERNAL_TOKEN, communityUrl: COMMUNITY })
    const body = {
      name: 'Feira adulta',
      publicTitle: 'Feira de jogos',
      description: '',
      context: 'event',
      code: 'feira-adulta',
      startsAt: '2026-01-01T00:00:00Z',
      endsAt: '2099-01-01T00:00:00Z',
      status: 'active',
      channel: 'feira',
      audience: 'adult',
    }
    const created = await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(body),
      }),
    )
    expect(created.status).toBe(201)
    const { campaign } = (await created.json()) as {
      campaign: { id: string; audience: string; updatedAt: string }
    }
    expect(campaign.audience).toBe('adult')
    const code = await app.handle(req('/referrals/internal/codes/feira-adulta', { headers }))
    expect(await code.json()).toMatchObject({ audience: 'adult', giftAvailable: true })

    const locked = await app.handle(
      req(`/referrals/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...body, audience: 'kids', expectedUpdatedAt: campaign.updatedAt }),
      }),
    )
    expect(locked.status).toBe(409)
    expect(await locked.json()).toMatchObject({ error: { code: 'CAMPAIGN_AUDIENCE_LOCKED' } })

    const invalid = await app.handle(
      req('/referrals/admin/campaigns', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ ...body, code: 'feira-pro', audience: 'pro' }),
      }),
    )
    expect(invalid.status).toBe(400)
  })
})

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

function buildApp(opts: { internalToken?: string; metricsToken?: string } = {}) {
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
      leaseMs: 90_000,
      campaigns: campaignRepo,
    },
    silentLogger,
  )
  const invite = new CreateInviteService(
    repo,
    gateway,
    { funnelPublicUrl: FUNNEL_URL, dailyLimit: 50 },
    silentLogger,
  )
  const ambassadors = new AmbassadorAdminService(
    repo,
    gateway,
    { funnelPublicUrl: FUNNEL_URL },
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

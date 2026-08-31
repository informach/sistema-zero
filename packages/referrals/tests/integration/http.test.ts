import { describe, expect, test } from 'bun:test'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { CreateInviteService } from '../../src/application/invites/create-invite.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import { createServer } from '../../src/interfaces/http/server'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const INTERNAL_TOKEN = 'internal-token-32-chars-ok-xxxxx'
const METRICS_TOKEN = 'metrics-token-32-chars-okay-xxxx'
const FUNNEL_URL = 'https://sistemazero.com.br'

function buildApp(opts: { internalToken?: string; metricsToken?: string } = {}) {
  const repo = new InMemoryReferralRepository()
  const gateway = new FakeReferralsGateway()
  const redeem = new RedeemScholarshipService(
    repo,
    gateway,
    {
      offerSlug: 'desafio-primeiro-jogo',
      kidsCommunityUrl: 'https://kids.sistemazero.com.br',
      leaseMs: 90_000,
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
    funnelPublicUrl: FUNNEL_URL,
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

function req(path: string, init: RequestInit = {}) {
  return new Request(`http://referrals.local${path}`, init)
}

describe('borda HTTP do referrals', () => {
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
      expect(await redeem.json()).toEqual({ status: 'completed' })

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

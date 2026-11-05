import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { CampaignAdminService } from '../../src/application/campaigns/campaign-admin.service'
import { RecordConversionService } from '../../src/application/conversions/record-conversion.service'
import type { PaymentSnapshot } from '../../src/domain/ports/clients.port'
import { DrizzleCampaignRepository } from '../../src/infrastructure/persistence/drizzle/campaign.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleReferralRepository } from '../../src/infrastructure/persistence/drizzle/referral.repository'
import { conversions } from '../../src/infrastructure/persistence/drizzle/schema'
import { FakeReferralsGateway, silentLogger } from '../fakes/in-memory'

// Exige banco explicitamente descartável; nunca usa DATABASE_URL da aplicação.
const url = process.env.TEST_DATABASE_URL
describe.skipIf(!url)('regressões do full review de campanhas — PostgreSQL real', () => {
  let connection: DbConnection
  let repo: DrizzleReferralRepository
  let campaigns: DrizzleCampaignRepository
  let admin: CampaignAdminService

  beforeAll(async () => {
    connection = createDbConnection(url!, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'referrals_migrations',
    })
    repo = new DrizzleReferralRepository(connection.db)
    campaigns = new DrizzleCampaignRepository(connection.db)
    admin = new CampaignAdminService(campaigns, repo, 'https://example.test')
  })
  afterAll(async () => connection?.close())

  test('calendário persiste e atualização concorrente não sobrescreve a nova data', async () => {
    const f = await fixture(8000)
    const schedule = { eventDate: '2026-11-06', giftClaimDays: 3, couponClaimDays: 7 }
    const saved = await admin.update(
      f.campaign.id,
      { ...f.campaign, schedule, expectedUpdatedAt: f.campaign.updatedAt },
      'Teste',
    )
    const stored = await campaigns.findById(f.campaign.id)
    expect(stored?.schedule).toEqual(schedule)
    expect(stored?.endsAt.toISOString()).toBe('2026-11-09T03:00:00.000Z')
    const moved = await admin.update(
      f.campaign.id,
      {
        ...saved!,
        schedule: { ...schedule, eventDate: '2026-12-30' },
        expectedUpdatedAt: saved!.updatedAt,
      },
      'Teste',
    )
    expect(moved?.endsAt).toBe('2027-01-02T03:00:00.000Z')
    let conflict: unknown
    try {
      await admin.update(f.campaign.id, { ...saved!, expectedUpdatedAt: saved!.updatedAt }, 'Outro')
    } catch (error) {
      conflict = error
    }
    expect(conflict).toBeInstanceOf(Error)
    expect(String(conflict)).toContain('alterada')
    expect((await campaigns.findById(f.campaign.id))?.schedule?.eventDate).toBe('2026-12-30')
  })

  test('consulta do parceiro filtra no SQL antes do limite e da contagem', async () => {
    const mine = await fixture(8000)
    const other = await fixture(8000)
    await admin.create(
      { ...mine.campaign, code: `draft-${crypto.randomUUID().slice(0, 8)}`, status: 'draft' },
      'Teste',
    )
    const result = await campaigns.list({
      ambassadorId: mine.person.ambassador.id,
      publishedOnly: true,
      limit: 1,
      offset: 0,
    })
    expect(result.total).toBe(1)
    expect(result.items.map((item) => item.id)).toEqual([mine.campaign.id])
    expect(result.items.some((item) => item.id === other.campaign.id)).toBe(false)
    expect(
      (
        await campaigns.list({
          ambassadorId: mine.person.ambassador.id,
          publishedOnly: true,
          limit: 1,
          offset: 1,
        })
      ).items,
    ).toEqual([])
  })

  async function fixture(commissionAnnualAmountCents?: number) {
    const suffix = crypto.randomUUID().slice(0, 8)
    const person = await repo.createAmbassadorWithCode({
      name: 'Parceira',
      email: `partner-${suffix}@example.test`,
      code: `partner-${suffix}`,
      pageToken: crypto.randomUUID().repeat(2),
    })
    if (person.kind !== 'created') throw Error('seed')
    const campaign = await admin.create(
      {
        name: 'Palestra',
        publicTitle: 'Presente',
        description: '',
        context: 'event',
        code: `review-${suffix}`,
        channel: 'palestra',
        audience: 'kids',
        status: 'active',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 3_600_000).toISOString(),
        ambassadorId: person.ambassador.id,
        commissionEnabled: true,
        commissionAmountCents: 4500,
        commissionAnnualAmountCents,
        commissionWindowDays: 30,
      },
      'Teste',
    )
    const code = (await repo.findCodeByCode(campaign!.code))!
    const payments = new Map<string, PaymentSnapshot>()
    const service = new RecordConversionService(
      repo,
      {
        getPayment: async (id) => payments.get(id) ?? null,
        getSubscriptionCreatedAt: async () => null,
      },
      {
        getOfferById: async () => ({
          id: 'offer',
          slug: 'comunidade-dos-criadores-anual',
          name: 'Anual',
          billingIntervalMonths: 12,
        }),
      },
      {
        conversionOfferSlugs: ['comunidade-dos-criadores-anual'],
        bonusAmountCents: 3000,
        matureHours: 180,
      },
      silentLogger,
    )
    async function claim(email = `${crypto.randomUUID()}@example.test`) {
      const input = {
        codeId: code.id,
        audience: 'kids' as const,
        email,
        name: 'Pessoa',
        phone: null,
      }
      const { redemption } = await repo.insertRedemption(input)
      await repo.markRedemptionGranted(redemption.id, new Date())
      return redemption
    }
    function payment(email: string, paidAt: Date) {
      const id = crypto.randomUUID()
      payments.set(id, {
        id,
        status: 'PAID',
        paidAt,
        customer: { email, name: 'Pessoa' },
        amountInCents: 9700n,
        subscriptionId: null,
        metadata: { offerId: 'offer' },
      })
      return id
    }
    const paid = (id: string) =>
      service.execute({
        deliveryId: crypto.randomUUID(),
        eventName: 'payment.paid',
        payload: { paymentId: id },
      })
    async function refund(id: string) {
      payments.get(id)!.status = 'REFUNDED'
      return service.execute({
        deliveryId: crypto.randomUUID(),
        eventName: 'payment.refunded',
        payload: { paymentId: id },
      })
    }
    return { person, campaign: campaign!, code, claim, payment, paid, refund, payments }
  }

  test('snapshot SQL preserva mensal/anual após edição e novos resgates usam o novo acordo', async () => {
    const f = await fixture(8000)
    const first = await f.claim()
    expect(first.campaignReferral).toMatchObject({
      commissionAmountCents: 4500,
      commissionAnnualAmountCents: 8000,
    })
    await admin.update(
      f.campaign.id,
      { ...f.campaign, commissionAnnualAmountCents: 9000, expectedUpdatedAt: f.campaign.updatedAt },
      'Teste',
    )
    const second = await f.claim()
    const firstReloaded = (await repo.listRedemptionsWithCodeByEmail(first.email))[0]!.redemption
    expect(firstReloaded.campaignReferral?.commissionAnnualAmountCents).toBe(8000)
    expect(second.campaignReferral?.commissionAnnualAmountCents).toBe(9000)
    for (const r of [first, second])
      await f.paid(f.payment(r.email, new Date(r.createdAt.getTime() + 1000)))
    expect((await repo.listConversionsByRedemptions([first.id]))[0]?.bonusCents).toBe(8000)
    expect((await repo.listConversionsByRedemptions([second.id]))[0]?.bonusCents).toBe(9000)
    const disabled = await admin.detail(f.campaign.id)
    await admin.update(
      f.campaign.id,
      {
        ...disabled!.campaign,
        commissionEnabled: false,
        expectedUpdatedAt: disabled!.campaign.updatedAt,
      },
      'Teste',
    )
    expect((await f.claim()).campaignReferral?.commissionAnnualAmountCents).toBeNull()
    const direct = await repo.insertRedemption({
      codeId: f.person.code.id,
      email: `${crypto.randomUUID()}@example.test`,
      name: 'Direto',
      phone: null,
      audience: 'kids',
      bonusAmounts: { monthly: 3000, annual: 8000 },
    })
    expect(
      (await repo.listRedemptionsWithCodeByEmail(direct.redemption.email))[0]?.redemption
        .bonusAmounts,
    ).toEqual({ monthly: 3000, annual: 8000 })
  })

  test.each([
    'early-first',
    'late-first',
    'concurrent',
  ])('pagamentos %s preservam uma comissão, os relatórios e o Pix idempotente', async (order) => {
    const f = await fixture()
    const r = await f.claim()
    const early = f.payment(r.email, new Date(r.createdAt.getTime() + 86_400_000))
    const late = f.payment(r.email, new Date(r.createdAt.getTime() + 31 * 86_400_000))
    if (order === 'concurrent') await Promise.all([f.paid(late), f.paid(early)])
    else for (const id of order === 'late-first' ? [late, early] : [early, late]) await f.paid(id)
    await Promise.all([f.paid(early), f.paid(late), f.paid(early)])
    const rows = await repo.listConversionsByRedemptions([r.id])
    expect(rows.filter((c) => c.status === 'pending')).toHaveLength(1)
    const selected = rows.find((c) => c.status === 'pending')!
    expect(selected).toMatchObject({ paymentId: early, bonusCents: 4500 })
    if (order === 'late-first')
      expect(rows.find((c) => c.paymentId === late)?.status).toBe('superseded')
    expect((await admin.detail(f.campaign.id))?.redemptions[0]?.conversion).toMatchObject({
      status: 'pending',
      bonusCents: 4500,
    })
    const ambassadors = new AmbassadorAdminService(
      repo,
      new FakeReferralsGateway(),
      { funnelPublicUrl: 'https://example.test', adultGiftEnabled: true },
      silentLogger,
    )
    expect(
      (await ambassadors.detail(f.person.ambassador.id))?.conversionByRedemption.get(r.id)
        ?.paymentId,
    ).toBe(early)
    expect((await campaigns.stats(f.campaign.id)).conversions).toBe(1)
    expect(await repo.markConversionPaid(selected.id, 'Teste', null)).toBe(false)
    await repo.matureConversions(new Date(selected.maturesAt.getTime() + 1), 1000)
    expect(await repo.markConversionPaid(selected.id, 'Teste', null)).toBe(true)
    expect(await repo.markConversionPaid(selected.id, 'Teste', null)).toBe(false)
    await f.paid(early)
    expect(
      (await repo.listConversionsByRedemptions([r.id])).filter((c) => c.status === 'paid'),
    ).toHaveLength(1)
  })

  test('estornos e duplicatas não revivem a compra substituída nem escondem o estorno corrente', async () => {
    const f = await fixture()
    const r = await f.claim()
    const early = f.payment(r.email, new Date(r.createdAt.getTime() + 86_400_000))
    const late = f.payment(r.email, new Date(r.createdAt.getTime() + 31 * 86_400_000))
    await f.paid(late)
    await f.paid(early)
    await f.refund(early)
    await f.paid(late)
    expect((await campaigns.stats(f.campaign.id)).conversions).toBe(0)
    expect((await admin.detail(f.campaign.id))?.redemptions[0]?.conversion?.status).toBe('canceled')
    await f.refund(late)
    await f.refund(late)
    expect(
      (await repo.listConversionsByRedemptions([r.id])).every((c) => c.status === 'canceled'),
    ).toBe(true)
    const next = f.payment(r.email, new Date(r.createdAt.getTime() + 2 * 86_400_000))
    await f.paid(next)
    expect((await campaigns.stats(f.campaign.id)).conversions).toBe(1)
  })

  test('estorno da compra tardia concorrente à correção não cancela a comissão anterior', async () => {
    const f = await fixture()
    const r = await f.claim()
    const early = f.payment(r.email, new Date(r.createdAt.getTime() + 86_400_000))
    const late = f.payment(r.email, new Date(r.createdAt.getTime() + 31 * 86_400_000))
    await f.paid(late)
    await Promise.all([f.paid(early), f.refund(late)])
    expect(
      (await repo.listConversionsByRedemptions([r.id])).filter((c) => c.status === 'pending'),
    ).toMatchObject([{ paymentId: early, bonusCents: 4500 }])
  })

  test('conflito de paymentId reverte a substituição inteira', async () => {
    const f = await fixture()
    const r = await f.claim()
    const other = await f.claim()
    const late = f.payment(r.email, new Date(r.createdAt.getTime() + 31 * 86_400_000))
    await f.paid(late)
    const candidate = {
      redemptionId: r.id,
      codeId: f.code.id,
      ambassadorId: f.person.ambassador.id,
      paymentId: crypto.randomUUID(),
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-anual',
      amountCents: 9700n,
      bonusCents: 4500,
      status: 'pending' as const,
      paidAt: new Date(r.createdAt.getTime() + 1000),
      maturesAt: new Date(Date.now() + 3600_000),
    }
    let unlock!: () => void
    let locked!: () => void
    const ready = new Promise<void>((resolve) => {
      locked = resolve
    })
    const release = new Promise<void>((resolve) => {
      unlock = resolve
    })
    const competing = connection.db.transaction(async (tx) => {
      await tx.insert(conversions).values({ ...candidate, redemptionId: other.id })
      locked()
      await release
    })
    await ready
    const inserting = repo.insertConversion(candidate)
    try {
      let blocked = false
      for (let attempt = 0; attempt < 100 && !blocked; attempt++) {
        const [row] =
          await connection.sql`select exists (select 1 from pg_stat_activity where datname = current_database() and cardinality(pg_blocking_pids(pid)) > 0) as blocked`
        blocked = row!.blocked
        if (!blocked) await Bun.sleep(10)
      }
      expect(blocked).toBe(true)
    } finally {
      unlock()
      await competing
    }
    expect(await inserting).toEqual({ created: false })
    expect(await repo.listConversionsByRedemptions([r.id])).toMatchObject([
      { paymentId: late, status: 'unrewarded' },
    ])
  })

  test('compra anterior não troca uma comissão elegível ou já paga', async () => {
    const f = await fixture()
    const r = await f.claim()
    const selectedId = f.payment(r.email, new Date(r.createdAt.getTime() + 2 * 86_400_000))
    await f.paid(selectedId)
    const [selected] = await repo.listConversionsByRedemptions([r.id])
    await repo.matureConversions(new Date(selected!.maturesAt.getTime() + 1), 1000)
    const earlier = f.payment(r.email, new Date(r.createdAt.getTime() + 86_400_000))
    await f.paid(earlier)
    expect(await repo.listConversionsByRedemptions([r.id])).toMatchObject([
      { paymentId: selectedId, status: 'eligible' },
    ])
    await repo.markConversionPaid(selected!.id, 'Operador', 'Pix confirmado')
    await f.paid(earlier)
    expect(await repo.listConversionsByRedemptions([r.id])).toMatchObject([
      { paymentId: selectedId, status: 'paid', paidMarkedBy: 'Operador', note: 'Pix confirmado' },
    ])
  })

  test('desativar preserva o acordo anterior e não cria novo acordo remunerado; reativar só vale para novos resgates', async () => {
    const f = await fixture()
    const old = await f.claim()
    await repo.updateAmbassador(f.person.ambassador.id, { status: 'disabled' })
    const current = await f.claim()
    expect(current.campaignReferral).toMatchObject({
      ambassadorId: f.person.ambassador.id,
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionWindowDays: null,
    })
    expect(
      (await repo.findRedemptionByEmail(old.email, 'kids'))?.campaignReferral?.commissionEnabled,
    ).toBe(true)
    for (const r of [old, current])
      await f.paid(f.payment(r.email, new Date(r.createdAt.getTime() + 1000)))
    expect((await repo.listConversionsByRedemptions([old.id]))[0]).toMatchObject({
      status: 'pending',
      bonusCents: 4500,
    })
    expect((await repo.listConversionsByRedemptions([current.id]))[0]).toMatchObject({
      status: 'unrewarded',
      bonusCents: 0,
    })
    await repo.updateAmbassador(f.person.ambassador.id, { status: 'active' })
    expect((await f.claim()).campaignReferral?.commissionEnabled).toBe(true)
    expect((await f.claim(current.email)).campaignReferral?.commissionEnabled).toBe(false)
  })

  test('resgate aguardando a desativação sob lock lê o status confirmado', async () => {
    const f = await fixture()
    let unlock!: () => void
    let locked!: () => void
    const ready = new Promise<void>((resolve) => {
      locked = resolve
    })
    const release = new Promise<void>((resolve) => {
      unlock = resolve
    })
    const disabling = connection.sql.begin(async (tx) => {
      await tx`update referrals.ambassadors set status = 'disabled' where id = ${f.person.ambassador.id}`
      locked()
      await release
    })
    await ready
    const claim = f.claim()
    try {
      let blocked = false
      for (let attempt = 0; attempt < 100 && !blocked; attempt++) {
        const [row] =
          await connection.sql`select exists (select 1 from pg_stat_activity where datname = current_database() and cardinality(pg_blocking_pids(pid)) > 0) as blocked`
        blocked = row!.blocked
        if (!blocked) await Bun.sleep(10)
      }
      expect(blocked).toBe(true)
    } finally {
      unlock()
      await disabling
    }
    expect((await claim).campaignReferral?.commissionEnabled).toBe(false)
  })

  test('autoindicação estornada sai da métrica; refund repetido e nova compra permanecem sem bônus', async () => {
    const f = await fixture()
    const r = await f.claim(f.person.ambassador.email)
    const id = f.payment(r.email, new Date(r.createdAt.getTime() + 1000))
    await f.paid(id)
    expect((await campaigns.stats(f.campaign.id)).conversions).toBe(1)
    await f.refund(id)
    await f.refund(id)
    expect((await campaigns.stats(f.campaign.id)).conversions).toBe(0)
    expect((await admin.detail(f.campaign.id))?.redemptions[0]?.conversion?.status).toBe('canceled')
    await f.paid(f.payment(r.email, new Date(r.createdAt.getTime() + 2000)))
    const rows = await repo.listConversionsByRedemptions([r.id])
    expect(rows.filter((c) => c.status === 'self_blocked')).toHaveLength(1)
    expect(rows.every((c) => c.bonusCents === 0)).toBe(true)
  })
})

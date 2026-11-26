import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import type { CampaignInput, CourseBenefitContext } from '@sistemazero/core/referrals'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { AcquisitionReportsService } from '../../src/application/acquisitions/acquisition-reports.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import { DrizzleAcquisitionRepository } from '../../src/infrastructure/persistence/drizzle/acquisition.repository'
import { DrizzleCampaignRepository } from '../../src/infrastructure/persistence/drizzle/campaign.repository'
import { DrizzleCourseBenefitRepository } from '../../src/infrastructure/persistence/drizzle/course-benefit.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleReferralRepository } from '../../src/infrastructure/persistence/drizzle/referral.repository'
import {
  FakeGiftOfferCatalog,
  FakeReferralsGateway,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

// Exige URL explícita: nunca usa o banco de desenvolvimento ou produção por fallback.
const url = process.env.TEST_DATABASE_URL
describe.skipIf(!url)('benefício do curso — migração e transações no Postgres', () => {
  let connection: DbConnection
  let repo: DrizzleReferralRepository
  let benefits: DrizzleCourseBenefitRepository
  let campaigns: DrizzleCampaignRepository
  let acquisitions: DrizzleAcquisitionRepository
  const courseSlug = 'transformando-o-vilao-em-aliado'
  beforeAll(async () => {
    connection = createDbConnection(url!, { max: 8 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'referrals_migrations',
    })
    repo = new DrizzleReferralRepository(connection.db)
    benefits = new DrizzleCourseBenefitRepository(connection.db)
    campaigns = new DrizzleCampaignRepository(connection.db)
    acquisitions = new DrizzleAcquisitionRepository(connection.db)
  })
  afterAll(async () => {
    await connection?.close()
  })
  beforeEach(async () => {
    await connection.sql`truncate referrals.course_benefits, referrals.acquisitions, referrals.conversions, referrals.invites, referrals.scholarship_redemptions, referrals.codes, referrals.ambassadors, referrals.campaign_history, referrals.campaigns cascade`
  })
  async function seed(patch: Partial<CampaignInput> = {}) {
    const campaign = await campaigns.create(
      {
        name: 'Presente interno antigo',
        publicTitle: 'Cadê no guia',
        description: '',
        context: 'other',
        code: 'guia-cade',
        audience: 'kids',
        kind: 'gift',
        status: 'active',
        channel: 'curso',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
        giftOfferId: KIDS_GIFT_OFFER.offerId,
        commissionEnabled: false,
        ...patch,
      },
      'QA',
    )
    if (!campaign) throw Error('seed campaign failed')
    const code = await repo.findCodeByCode(campaign.code)
    if (!code) throw Error('seed code failed')
    return { campaign, code }
  }
  const convert = (id: string) =>
    benefits.convertCampaign({
      campaignId: id,
      courseSlug,
      name: 'Cadê Todo Mundo — benefício do guia',
      audience: 'kids',
    })
  function context(id: string): CourseBenefitContext {
    return {
      benefitId: id,
      benefitName: 'Cadê no guia',
      courseSlug,
      lessonId: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
      accessOrigin: null,
      accessSource: {
        entitlementId: crypto.randomUUID(),
        sourceKind: 'payment',
        sourceId: 'paid-guide',
        subscriptionId: null,
      },
    }
  }
  test('conversão preserva código, resgates e prazos e arquiva o histórico sem manter campanha fictícia', async () => {
    const { campaign, code } = await seed()
    const redemptions = []
    for (const email of ['one@example.test', 'two@example.test']) {
      const r = await repo.insertRedemption({
        codeId: code.id,
        audience: 'kids',
        email,
        name: 'QA',
        phone: null,
        courseSlug: 'cade-todo-mundo',
        gift: { offerId: KIDS_GIFT_OFFER.offerId, accessDurationDays: 15, advertisedDays: 7 },
      })
      await repo.markRedemptionGranted(r.redemption.id, new Date())
      await connection.sql`update referrals.scholarship_redemptions set status='completed', completed_at=now() where id=${r.redemption.id}`
      await connection.sql`insert into referrals.acquisitions (email,audience,kind,redemption_id,code_id,campaign_id,origin_kind,acquired_at) values (${email},'kids','gift',${r.redemption.id},${code.id},${campaign.id},'campaign',now())`
      redemptions.push(r.redemption.id)
    }
    const before =
      await connection.sql`select id,code_id,access_duration_days,advertised_days,granted_at,completed_at from referrals.scholarship_redemptions order by email`
    const b = await convert(campaign.id)
    expect(b.codeId).toBe(code.id)
    expect(b.code).toBe(code.code)
    expect(await campaigns.findById(campaign.id)).toBeNull()
    expect(await convert(campaign.id)).toEqual(b)
    const after =
      await connection.sql`select id,code_id,access_duration_days,advertised_days,granted_at,completed_at from referrals.scholarship_redemptions order by email`
    expect([...after]).toEqual([...before])
    const [archive] =
      await connection.sql`select legacy_campaign, legacy_history from referrals.course_benefits where id=${b.id}`
    expect(archive!.legacy_campaign.id).toBe(campaign.id)
    expect(archive!.legacy_history).toHaveLength(1)
    const rows = await benefits.acquisitions(b.id)
    expect(rows).toHaveLength(2)
    expect(
      rows.every(
        (a) => a.originKind === 'course' && a.campaignId === null && a.bonusTerms === null,
      ),
    ).toBe(true)
    expect((await benefits.contexts(redemptions)).get(redemptions[0]!)?.accessOrigin).toBeNull()
  })
  test('ativação em andamento bloqueia conversão e a transação mantém campanha e código intactos', async () => {
    const { campaign, code } = await seed()
    await repo.insertRedemption({
      codeId: code.id,
      audience: 'kids',
      email: 'pending@example.test',
      name: 'QA',
      phone: null,
    })
    let failure: unknown
    try {
      await convert(campaign.id)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toContain('andamento')
    expect((await repo.findCodeByCode(code.code))?.ownerKind).toBe('campaign')
    expect(await benefits.findById(campaign.id)).toBeNull()
  })
  test('resgates concorrentes guardam um único contexto e não renovam o presente', async () => {
    const { campaign, code } = await seed()
    const b = await convert(campaign.id)
    const firstContext = context(b.id)
    const claim = {
      codeId: code.id,
      audience: 'kids' as const,
      email: 'race@example.test',
      name: 'QA',
      phone: null,
      benefitContext: firstContext,
      gift: {
        offerId: KIDS_GIFT_OFFER.offerId,
        accessDurationDays: 15,
        advertisedDays: 7,
        includesMural: true,
      },
    }
    const claims = await Promise.all([
      repo.insertRedemption(claim),
      repo.insertRedemption({ ...claim, benefitContext: context(b.id) }),
    ])
    expect(claims.filter((r) => r.created)).toHaveLength(1)
    expect(new Set(claims.map((r) => r.redemption.id)).size).toBe(1)
    expect(claims[0]!.redemption.benefitContext).toEqual(claims[1]!.redemption.benefitContext)
    expect(claims[0]!.redemption.accessDurationDays).toBe(15)
    expect(claims[0]!.redemption.advertisedDays).toBe(7)
  })
  test('resgate público é recusado; aula autenticada concede 15 dias, registra ambas origens e não paga comissão', async () => {
    const { campaign, code } = await seed()
    const b = await convert(campaign.id)
    const userId = crypto.randomUUID(),
      email = 'parent@example.test'
    await connection.sql`insert into referrals.acquisitions (email,account_user_id,audience,kind,payment_id,origin_kind,offer_slug,amount_cents,acquired_at) values (${email},${userId},'kids','one_time','paid-guide','ads','guia-1-ano',2700,now())`
    const gateway = new FakeReferralsGateway()
    const catalog = new FakeGiftOfferCatalog()
    catalog.offers = [{ ...KIDS_GIFT_OFFER, accessDurationValue: 15, advertisedAccessDays: 7 }]
    const service = new RedeemScholarshipService(
      repo,
      gateway,
      {
        kidsCommunityUrl: 'https://kids.test',
        leaseMs: 90_000,
        benefits,
        campaigns,
        acquisitions,
        giftOffers: catalog,
      },
      silentLogger,
    )
    const input = { code: code.code, email, name: 'QA' }
    expect((await service.execute(input)).kind).toBe('code_not_found')
    expect(gateway.calls).toHaveLength(0)
    const c = context(b.id)
    const account = {
      userId,
      audience: 'kids' as const,
      benefitSource: {
        courseSlug,
        lessonId: c.lessonId!,
        blockId: c.blockId!,
        accessSource: c.accessSource!,
      },
    }
    expect((await service.execute(input, { ...account, audience: 'adult' })).kind).toBe(
      'code_not_found',
    )
    expect(
      (
        await service.execute(input, {
          ...account,
          benefitSource: { ...account.benefitSource, courseSlug: 'outro-curso' },
        })
      ).kind,
    ).toBe('code_not_found')
    expect(gateway.calls).toHaveLength(0)
    expect((await service.execute(input, account)).kind).toBe('completed')
    expect((await service.execute(input, account)).kind).toBe('already_redeemed')
    expect(gateway.calls.filter((call) => call.kind === 'grantManualOffer')).toHaveLength(1)
    const gifts = await benefits.acquisitions(b.id)
    expect(gifts).toHaveLength(1)
    expect(gifts[0]).toMatchObject({
      originKind: 'course',
      campaignId: null,
      ambassadorId: null,
      bonusTerms: null,
    })
    const r = await repo.findRedemptionByEmail(email, 'kids')
    expect(r).toMatchObject({
      accessDurationDays: 15,
      advertisedDays: 7,
      benefitContext: { accessOrigin: { originKind: 'ads' } },
    })
    const reports = new AcquisitionReportsService(acquisitions, campaigns, repo, benefits)
    const report = await reports.courseBenefitDetail(b.id, 'kids')
    expect(report?.results.gifts).toBe(1)
    expect(report?.detail.people[0]?.entry.courseBenefit?.accessOrigin?.originKind).toBe('ads')
    expect(await reports.courseBenefitDetail(b.id, 'adult')).toBeNull()
    expect(
      (await reports.courseBenefitDetail(b.id, 'kids', 0, new Date(Date.now() + 60_000)))?.results
        .gifts,
    ).toBe(0)
  })
})

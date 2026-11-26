import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import type { CampaignInput } from '@sistemazero/core/referrals'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { NewAcquisition } from '../../src/domain/acquisition'
import { CampaignRedirectTakenError } from '../../src/domain/campaign'
import { DrizzleAcquisitionRepository } from '../../src/infrastructure/persistence/drizzle/acquisition.repository'
import { DrizzleAmbassadorOfferRepository } from '../../src/infrastructure/persistence/drizzle/ambassador-offer.repository'
import { DrizzleCampaignRepository } from '../../src/infrastructure/persistence/drizzle/campaign.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleReferralRepository } from '../../src/infrastructure/persistence/drizzle/referral.repository'

/**
 * O SQL da origem por aquisição (25/11/2026) que os fakes em memória reimplementam: UNIQUEs e
 * CHECK da 0013, leituras da pessoa, reparo dos presentes, cursor dos slugs, contadores por
 * oferta, a régua de "assinaram" da campanha, os endereços antigos e a vaga do bônus pela conta.
 * Exige `TEST_DATABASE_URL` apontando para um banco DESCARTÁVEL; sem ela, pula.
 */
const url = process.env.TEST_DATABASE_URL
const OFFER_A = '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7da1'
const OFFER_B = '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7da2'
const ACCOUNT = '5b0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d01'

describe.skipIf(!url)('origem por aquisição — PostgreSQL real', () => {
  let connection: DbConnection
  let repo: DrizzleReferralRepository
  let acquisitions: DrizzleAcquisitionRepository
  let campaigns: DrizzleCampaignRepository

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
    acquisitions = new DrizzleAcquisitionRepository(connection.db)
    campaigns = new DrizzleCampaignRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  beforeEach(async () => {
    await connection.sql`truncate referrals.acquisitions, referrals.ambassador_offers, referrals.conversions, referrals.invites, referrals.scholarship_redemptions, referrals.codes, referrals.ambassadors, referrals.campaign_history, referrals.campaigns cascade`
  })

  function acquisition(input: Partial<NewAcquisition> & Pick<NewAcquisition, 'email' | 'kind'>) {
    return acquisitions.insert({
      accountUserId: null,
      audience: 'kids',
      offerId: null,
      offerSlug: null,
      amountCents: 0n,
      paymentId: null,
      subscriptionId: null,
      redemptionId: null,
      originKind: 'none',
      codeId: null,
      campaignId: null,
      ambassadorId: null,
      place: null,
      utm: null,
      bonusTerms: null,
      acquiredAt: new Date(),
      ...input,
    })
  }

  async function ambassadorWithGift(email = 'paula@example.com') {
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: `cida-${crypto.randomUUID().slice(0, 6)}@example.com`,
      pageToken: crypto.randomUUID().repeat(2),
      code: `cida-${crypto.randomUUID().slice(0, 6)}`,
    })
    if (created.kind !== 'created') throw new Error('seed')
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: created.code.id,
      email,
      name: 'Paula',
      phone: null,
      courseSlug: 'cade-todo-mundo',
    })
    return { ...created, redemption }
  }

  const campaignBase: CampaignInput = {
    name: 'Evento',
    publicTitle: 'Presente',
    description: '',
    context: 'event',
    code: 'unused',
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2099-01-01T00:00:00Z',
    status: 'active',
    channel: 'teste',
    audience: 'kids',
  }

  async function expectThrows(run: () => Promise<unknown>): Promise<unknown> {
    try {
      await run()
    } catch (error) {
      return error
    }
    throw new Error('esperava erro')
  }

  test('insert é idempotente por pagamento e por resgate; o CHECK recusa compra sem pagamento', async () => {
    const { redemption, code } = await ambassadorWithGift()
    const gift = await acquisition({
      email: ' Paula@Example.com ',
      kind: 'gift',
      redemptionId: redemption.id,
      originKind: 'ambassador',
      codeId: code.id,
    })
    expect(gift.created).toBe(true)
    expect(gift.acquisition.email).toBe('paula@example.com')
    const again = await acquisition({
      email: 'paula@example.com',
      kind: 'gift',
      redemptionId: redemption.id,
    })
    expect(again).toMatchObject({ created: false, acquisition: { id: gift.acquisition.id } })

    const paid = await acquisition({
      email: 'paula@example.com',
      kind: 'one_time',
      paymentId: 'pay-1',
      offerId: OFFER_A,
      amountCents: 9700n,
    })
    const paidAgain = await acquisition({
      email: 'x@example.com',
      kind: 'one_time',
      paymentId: 'pay-1',
    })
    expect(paidAgain).toMatchObject({ created: false, acquisition: { id: paid.acquisition.id } })
    expect(paidAgain.acquisition.amountCents).toBe(9700n)
    expect((await acquisitions.findByPayment('pay-1'))?.id).toBe(paid.acquisition.id)

    // Compra sem pagamento e presente sem resgate: `acquisitions_source_check`.
    const noPayment = await expectThrows(() =>
      acquisition({ email: 'a@example.com', kind: 'one_time' }),
    )
    expect(String((noPayment as { cause?: unknown }).cause ?? noPayment)).toContain(
      'acquisitions_source_check',
    )
    const noRedemption = await expectThrows(() =>
      acquisition({ email: 'a@example.com', kind: 'gift' }),
    )
    expect(String((noRedemption as { cause?: unknown }).cause ?? noRedemption)).toContain(
      'acquisitions_source_check',
    )
  })

  test('corrida na aquisição do pagamento cria uma linha; reentrega não revive o estorno', async () => {
    const input = { email: 'paula@example.com', kind: 'one_time' as const, paymentId: 'pay-race' }
    const results = await Promise.all([acquisition(input), acquisition(input)])
    expect(results.filter((r) => r.created)).toHaveLength(1)
    expect(new Set(results.map((r) => r.acquisition.id)).size).toBe(1)
    await acquisitions.markRefundedByPayment(input.paymentId)
    expect((await acquisition(input)).acquisition.status).toBe('refunded')
    expect(
      await acquisitions.listActiveForPerson({ email: input.email, audience: 'kids' }),
    ).toEqual([])
  })

  test('pessoa: e-mail OU conta, só ativas e do público, da mais antiga para a mais nova; estorno sai', async () => {
    await acquisition({
      email: 'b@example.com',
      kind: 'one_time',
      paymentId: 'p-new',
      acquiredAt: new Date('2026-11-03T00:00:00Z'),
    })
    await acquisition({
      email: 'other@example.com',
      accountUserId: ACCOUNT,
      kind: 'subscription',
      paymentId: 'p-account',
      subscriptionId: 'sub-1',
      acquiredAt: new Date('2026-11-01T00:00:00Z'),
    })
    await acquisition({
      email: 'b@example.com',
      audience: 'adult',
      kind: 'one_time',
      paymentId: 'p-adult',
    })
    await acquisition({
      email: 'b@example.com',
      kind: 'one_time',
      paymentId: 'p-refunded',
      acquiredAt: new Date('2026-10-01T00:00:00Z'),
    })
    expect((await acquisitions.markRefundedByPayment('p-refunded'))?.status).toBe('refunded')
    const person = await acquisitions.listActiveForPerson({
      email: 'B@example.com',
      accountUserId: ACCOUNT,
      audience: 'kids',
    })
    expect(person.map((a) => a.paymentId)).toEqual(['p-account', 'p-new'])
    expect(
      (await acquisitions.listActiveForPerson({ email: 'b@example.com', audience: 'kids' })).map(
        (a) => a.paymentId,
      ),
    ).toEqual(['p-new'])
    expect(await acquisitions.hasSubscription('sub-1')).toBe(true)
    expect(await acquisitions.hasSubscription('sub-x')).toBe(false)
    expect(
      (await acquisitions.listForEmails('kids', ['b@example.com'])).map((a) => a.paymentId),
    ).toEqual(['p-refunded', 'p-new'])
    expect((await acquisitions.listByEmail(' B@example.com')).length).toBe(3)
  })

  test('reparo: só presentes concluídos sem aquisição, filtráveis por e-mail; slug do curso do resgate', async () => {
    const a = await ambassadorWithGift('a@example.com')
    const b = await ambassadorWithGift('b@example.com')
    await ambassadorWithGift('pending@example.com') // pendente: fora
    await repo.markRedemptionGranted(a.redemption.id, new Date())
    await repo.markRedemptionGranted(b.redemption.id, new Date())
    expect(
      (await acquisitions.listCompletedRedemptionsWithoutAcquisition(10)).map(
        (r) => r.redemption.email,
      ),
    ).toEqual(['a@example.com', 'b@example.com'])
    const onlyB = await acquisitions.listCompletedRedemptionsWithoutAcquisition(
      10,
      ' B@example.com',
    )
    expect(onlyB.map((r) => [r.redemption.email, r.code.id])).toEqual([
      ['b@example.com', b.code.id],
    ])
    await acquisition({ email: 'a@example.com', kind: 'gift', redemptionId: a.redemption.id })
    expect(
      (await acquisitions.listCompletedRedemptionsWithoutAcquisition(10)).map(
        (r) => r.redemption.email,
      ),
    ).toEqual(['b@example.com'])
    const slugs = await acquisitions.giftCourseSlugs([
      a.redemption.id,
      b.redemption.id,
      crypto.randomUUID(),
    ])
    const expectedSlugs: [string, string][] = [
      [a.redemption.id, 'cade-todo-mundo'],
      [b.redemption.id, 'cade-todo-mundo'],
    ]
    expect([...slugs.entries()].sort()).toEqual(expectedSlugs.sort())
    expect((await acquisitions.giftCourseSlugs([])).size).toBe(0)
  })

  test('slugs: cursor (createdAt, id) avança e o slug da Comunidade vira assinatura só de compra avulsa', async () => {
    for (const n of [1, 2, 3])
      await acquisition({
        email: `s${n}@example.com`,
        kind: 'one_time',
        paymentId: `s-${n}`,
        offerId: OFFER_A,
      })
    await acquisition({ email: 'nooffer@example.com', kind: 'one_time', paymentId: 's-none' })
    const first = await acquisitions.listMissingOfferSlug(2)
    expect(first).toHaveLength(2)
    const rest = await acquisitions.listMissingOfferSlug(2, first.at(-1))
    expect(rest).toHaveLength(1)
    expect(new Set([...first, ...rest].map((r) => r.id)).size).toBe(3)

    await acquisitions.setOfferSlug(first[0]!.id, 'comunidade-dos-criadores-anual', true)
    await acquisitions.setOfferSlug(first[1]!.id, 'cade-todo-mundo-1-ano', false)
    // Slug já gravado não é trocado.
    await acquisitions.setOfferSlug(first[1]!.id, 'outro', true)
    const rows = await connection.sql<{ id: string; kind: string; offer_slug: string | null }[]>`
      select id, kind, offer_slug from referrals.acquisitions where id in ${connection.sql([first[0]!.id, first[1]!.id])}`
    const byId = new Map(rows.map((r) => [r.id, r]))
    expect(byId.get(first[0]!.id)).toMatchObject({
      kind: 'subscription',
      offer_slug: 'comunidade-dos-criadores-anual',
    })
    expect(byId.get(first[1]!.id)).toMatchObject({
      kind: 'one_time',
      offer_slug: 'cade-todo-mundo-1-ano',
    })
    expect((await acquisitions.listMissingOfferSlug(10)).map((r) => r.id)).toEqual([rest[0]!.id])
  })

  test('contadores por oferta: só embaixador, ativas, do público, agrupadas por tipo', async () => {
    const { redemption, ambassador, code } = await ambassadorWithGift()
    const viaAmbassador = {
      originKind: 'ambassador' as const,
      ambassadorId: ambassador.id,
      codeId: code.id,
    }
    await acquisition({
      email: 'a@example.com',
      kind: 'gift',
      redemptionId: redemption.id,
      offerId: OFFER_A,
      ...viaAmbassador,
    })
    await acquisition({
      email: 'a@example.com',
      kind: 'one_time',
      paymentId: 'c1',
      offerId: OFFER_A,
      ...viaAmbassador,
    })
    await acquisition({
      email: 'b@example.com',
      kind: 'one_time',
      paymentId: 'c2',
      offerId: OFFER_A,
      ...viaAmbassador,
    })
    await acquisition({
      email: 'c@example.com',
      kind: 'subscription',
      paymentId: 'c3',
      offerId: OFFER_B,
      ...viaAmbassador,
    })
    await acquisition({
      email: 'd@example.com',
      kind: 'one_time',
      paymentId: 'c4',
      offerId: OFFER_A,
    })
    await acquisition({
      email: 'e@example.com',
      kind: 'one_time',
      paymentId: 'c5',
      offerId: OFFER_A,
      audience: 'adult',
      ...viaAmbassador,
    })
    await acquisition({
      email: 'f@example.com',
      kind: 'one_time',
      paymentId: 'c6',
      offerId: OFFER_A,
      ...viaAmbassador,
    })
    await acquisitions.markRefundedByPayment('c6')
    const counts = await acquisitions.countAmbassadorAcquisitionsByOffer('kids')
    const key = (r: { offerId: string; kind: string }) => `${r.offerId}:${r.kind}`
    expect(Object.fromEntries(counts.map((r) => [key(r), r.count]))).toEqual({
      [`${OFFER_A}:gift`]: 1,
      [`${OFFER_A}:one_time`]: 2,
      [`${OFFER_B}:subscription`]: 1,
    })
    expect((await acquisitions.listByAmbassadors([ambassador.id])).length).toBe(6)
  })

  test('campanha: "assinaram" pelo link OU depois do presente dela, uma vez por pessoa e só no público', async () => {
    const campaign = (await campaigns.create({ ...campaignBase, code: 'evento-x' }, 'QA'))!
    const code = (await repo.findCodeByCode('evento-x'))!
    const { redemption } = (await repo.insertRedemption({
      audience: 'kids',
      codeId: code.id,
      email: 'gift@example.com',
      name: 'G',
      phone: null,
    }))!
    const fromCampaign = {
      campaignId: campaign.id,
      codeId: code.id,
      originKind: 'campaign' as const,
    }
    expect(await campaigns.hasAcquisitions(campaign.id)).toBe(false)
    await acquisition({
      email: 'gift@example.com',
      kind: 'gift',
      redemptionId: redemption.id,
      acquiredAt: new Date('2026-11-10T00:00:00Z'),
      ...fromCampaign,
    })
    expect(await campaigns.hasAcquisitions(campaign.id)).toBe(true)
    // Depois do presente, sem código: conta (duas vezes a mesma pessoa = uma).
    await acquisition({
      email: 'gift@example.com',
      kind: 'subscription',
      paymentId: 'g1',
      acquiredAt: new Date('2026-11-11T00:00:00Z'),
    })
    await acquisition({
      email: 'gift@example.com',
      kind: 'subscription',
      paymentId: 'g2',
      acquiredAt: new Date('2026-11-12T00:00:00Z'),
    })
    // ANTES do presente, outro público e compra avulsa: não contam.
    await acquisition({
      email: 'early@example.com',
      kind: 'subscription',
      paymentId: 'g3',
      acquiredAt: new Date('2026-11-01T00:00:00Z'),
    })
    await acquisition({
      email: 'gift@example.com',
      kind: 'subscription',
      paymentId: 'g4',
      audience: 'adult',
    })
    await acquisition({ email: 'gift@example.com', kind: 'one_time', paymentId: 'g5' })
    // Pelo link da campanha: conta.
    await acquisition({
      email: 'direct@example.com',
      kind: 'subscription',
      paymentId: 'g6',
      ...fromCampaign,
    })
    expect((await campaigns.stats(campaign.id)).conversions).toBe(2)
    await acquisitions.markRefundedByPayment('g6')
    expect((await campaigns.stats(campaign.id)).conversions).toBe(1)
    expect((await campaigns.stats(campaign.id)).redemptions).toBe(0) // o resgate segue pendente
    expect((await acquisitions.listByCampaigns([campaign.id])).length).toBe(2)
  })

  test('endereços antigos: único entre campanhas, ativo só no prazo e fora do rascunho', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const a = (await campaigns.create(
      {
        ...campaignBase,
        code: 'evento-a',
        redirectPath: '/kids/evento-antigo',
        redirectUntil: future,
      },
      'QA',
    ))!
    expect(a.redirectPath).toBe('/kids/evento-antigo')
    const taken = await expectThrows(() =>
      campaigns.create(
        {
          ...campaignBase,
          code: 'evento-b',
          redirectPath: '/kids/evento-antigo',
          redirectUntil: future,
        },
        'QA',
      ),
    )
    expect(taken).toBeInstanceOf(CampaignRedirectTakenError)
    await campaigns.create(
      {
        ...campaignBase,
        code: 'evento-c',
        status: 'draft',
        redirectPath: '/kids/rascunho',
        redirectUntil: future,
      },
      'QA',
    )
    await campaigns.create(
      {
        ...campaignBase,
        code: 'evento-d',
        redirectPath: '/kids/vencido',
        redirectUntil: '2026-01-02T00:00:00Z',
      },
      'QA',
    )
    expect((await campaigns.findByRedirectPath('/kids/evento-antigo'))?.code).toBe('evento-a')
    expect(await campaigns.findByRedirectPath('/kids/nada')).toBeNull()
    expect((await campaigns.listActiveRedirects(new Date())).map((c) => c.code)).toEqual([
      'evento-a',
    ])
  })

  test('listas dos embaixadores: troca a lista inteira, na ordem, por público e tipo; saves simultâneos', async () => {
    const offers = new DrizzleAmbassadorOfferRepository(connection.db)
    await offers.replace('kids', 'gift', [
      { offerId: OFFER_A, enabled: true },
      { offerId: OFFER_B, enabled: false },
    ])
    await offers.replace('kids', 'referral', [{ offerId: OFFER_A, enabled: true }])
    await offers.replace('adult', 'gift', [{ offerId: OFFER_B, enabled: true }])
    const saved = await Promise.all([
      offers.replace('kids', 'gift', [{ offerId: OFFER_B, enabled: true }]),
      offers.replace('kids', 'gift', [
        { offerId: OFFER_B, enabled: true },
        { offerId: OFFER_A, enabled: true },
      ]),
    ])
    expect(saved.every((list) => list.length > 0)).toBe(true)
    const gift = await offers.list('kids', 'gift')
    expect([[OFFER_B], [OFFER_B, OFFER_A]]).toContainEqual(gift.map((o) => o.offerId))
    expect(gift.map((o) => o.position)).toEqual(gift.map((_, i) => i))
    expect((await offers.list('kids')).map((o) => o.kind)).toEqual([
      ...gift.map(() => 'gift' as const),
      'referral' as const,
    ])
    expect((await offers.list('adult')).map((o) => [o.offerId, o.enabled])).toEqual([
      [OFFER_B, true],
    ])
    expect(await offers.replace('adult', 'gift', [])).toEqual([])
  })

  test('vaga do bônus: a mesma CONTA com outro e-mail não converte duas vezes; lista pelos e-mails', async () => {
    const { redemption, code, ambassador } = await ambassadorWithGift('first@example.com')
    const base = {
      redemptionId: redemption.id,
      audience: 'kids' as const,
      codeId: code.id,
      ambassadorId: ambassador.id,
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending' as const,
      paidAt: new Date('2026-11-20T00:00:00Z'),
      maturesAt: new Date('2026-11-28T00:00:00Z'),
      accountUserId: ACCOUNT,
    }
    const results = await Promise.all([
      repo.insertConversion({
        ...base,
        subscriberEmail: 'first@example.com',
        paymentId: 'v1',
        personEmails: ['first@example.com', 'second@example.com'],
      }),
      repo.insertConversion({
        ...base,
        redemptionId: null,
        subscriberEmail: 'second@example.com',
        paymentId: 'v2',
        personEmails: ['second@example.com', 'first@example.com'],
      }),
    ])
    expect(results.filter((r) => r.created)).toHaveLength(1)
    expect(
      (await repo.listConversionsBySubscribers(['first@example.com', 'second@example.com'])).length,
    ).toBe(1)
    // Outra pessoa (outro e-mail, sem conta) converte normalmente.
    const other = await repo.insertConversion({
      ...base,
      redemptionId: null,
      accountUserId: null,
      subscriberEmail: 'third@example.com',
      paymentId: 'v3',
      personEmails: ['third@example.com'],
    })
    expect(other.created).toBe(true)
    // O mesmo e-mail em outro público tem a própria vaga.
    const adult = await repo.insertConversion({
      ...base,
      redemptionId: null,
      accountUserId: null,
      audience: 'adult',
      subscriberEmail: 'third@example.com',
      paymentId: 'v4',
    })
    expect(adult.created).toBe(true)
    const third = await repo.insertConversion({
      ...base,
      redemptionId: null,
      accountUserId: null,
      subscriberEmail: 'third@example.com',
      paymentId: 'v5',
    })
    expect(third.created).toBe(false)
    expect(await repo.listConversionsBySubscribers([])).toEqual([])
  })
})

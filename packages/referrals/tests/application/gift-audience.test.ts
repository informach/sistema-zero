import { beforeEach, describe, expect, test } from 'bun:test'
import type { CampaignInput } from '@sistemazero/core/referrals'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { ensureAmbassadorShareCode } from '../../src/application/ambassadors/ambassador-codes'
import {
  CampaignAdminService,
  validateCampaignInput,
} from '../../src/application/campaigns/campaign-admin.service'
import { RecordConversionService } from '../../src/application/conversions/record-conversion.service'
import { CreateInviteService } from '../../src/application/invites/create-invite.service'
import {
  type RedeemOptions,
  RedeemScholarshipService,
} from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import { giftAcquisition } from '../../src/domain/acquisition'
import { CampaignAudienceLockedError, CampaignValidationError } from '../../src/domain/campaign'
import { isMuralTrialGranted, offerGiftAudience } from '../../src/domain/gift-policy'
import type { PaymentSnapshot } from '../../src/domain/ports/clients.port'
import type { SendEmailInput } from '../../src/domain/ports/gateway.port'
import { InMemoryAcquisitionRepository } from '../fakes/acquisitions'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import {
  ADULT_GIFT_OFFER,
  FakeGiftOfferCatalog,
  FakeReferralsGateway,
  InMemoryReferralRepository,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

const FUNNEL = 'https://sistemazero.com.br'
const COMMUNITY = 'https://comunidade.sistemazero.com.br'
const TOKEN = 't'.repeat(43)
const OPTS: Omit<RedeemOptions, 'giftOffers'> = {
  kidsCommunityUrl: 'https://kids.sistemazero.com.br',
  communityUrl: COMMUNITY,
  leaseMs: 90_000,
}

async function seedAmbassador(repo: InMemoryReferralRepository) {
  const created = await repo.createAmbassadorWithCode({
    name: 'Marta Lima',
    email: 'marta@example.com',
    pageToken: TOKEN,
    code: 'marta-kd23',
  })
  if (created.kind !== 'created') throw new Error('seed falhou')
  const adult = await repo.ensureAmbassadorCode({
    ambassadorId: created.ambassador.id,
    audience: 'adult',
    code: 'marta-ad45',
  })
  if (adult?.kind !== 'ok') throw new Error('seed adulto falhou')
  return { ...created, adultCode: adult.code }
}

describe('presente adulto: resgate', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let catalog: FakeGiftOfferCatalog
  let service: RedeemScholarshipService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    catalog = new FakeGiftOfferCatalog()
    service = new RedeemScholarshipService(
      repo,
      gateway,
      { ...OPTS, giftOffers: catalog },
      silentLogger,
    )
    await seedAmbassador(repo)
  })

  const adultInput = { code: 'marta-ad45', name: 'Ana Souza', email: 'ana@example.com' }

  test('conta nova: oferta adulta, e-mail adulto com link do app adulto', async () => {
    const result = await service.execute(adultInput)
    expect(result).toMatchObject({ kind: 'completed', muralAccess: 'trial' })
    const r = repo.redemptions[0]!
    expect(r.audience).toBe('adult')
    expect(r.courseSlug).toBe('cade-todo-mundo-adulto')
    expect(r.giftOfferId).toBe(ADULT_GIFT_OFFER.offerId)
    expect(catalog.calls).toEqual(['cade-todo-mundo-adulto-7-dias'])

    expect(gateway.callsOf('getGiftAvailability')[0]?.input).toEqual({
      courseRef: 'cade-todo-mundo-adulto',
      audience: 'adult',
    })
    expect(gateway.callsOf('grantManualOffer')[0]?.input).toMatchObject({
      offerRef: ADULT_GIFT_OFFER.offerId,
      audience: 'adult',
      sourceId: `scholarship:${r.id}`,
      deliveryId: `scholarship:offer:${ADULT_GIFT_OFFER.offerId}:${r.id}`,
    })
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(0)
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-adult')
    expect(email.variables).toMatchObject({ nome: 'Ana', indicador: 'Marta' })
    expect(email.variables.validade).toContain('2026')
    expect(email.variables.mural).toContain('Mural adulto')
    expect(email.variables.link).toBe(`${COMMUNITY}/redefinir-senha?token=tok-abc`)
  })

  test('conta existente: sem token, link para Cursos do app adulto', async () => {
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-adulto', created: false } }
    expect((await service.execute(adultInput)).kind).toBe('completed')
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(0)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-existing-adult')
    expect(email.variables.link).toBe(`${COMMUNITY}/cursos`)
  })

  test('um resgate por e-mail POR PÚBLICO: Kids e adulto convivem; repetir o adulto → 409', async () => {
    expect((await service.execute({ ...adultInput, code: 'marta-kd23' })).kind).toBe('completed')
    expect((await service.execute(adultInput)).kind).toBe('completed')
    expect(repo.redemptions.map((r) => r.audience).sort()).toEqual(['adult', 'kids'])
    expect((await service.execute(adultInput)).kind).toBe('already_redeemed')
    expect((await service.execute({ ...adultInput, code: 'marta-kd23' })).kind).toBe(
      'already_redeemed',
    )
  })

  test('consulta do curso Kids continua sem o campo audience no fio', async () => {
    await service.execute({ ...adultInput, code: 'marta-kd23' })
    expect(gateway.callsOf('getGiftAvailability')[0]?.input).toEqual({
      courseRef: 'cade-todo-mundo',
    })
    expect(gateway.callsOf('grantManualOffer')[0]?.input).toMatchObject({
      offerRef: KIDS_GIFT_OFFER.offerId,
      audience: 'kids',
    })
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-mural-trial')
  })

  test('sem COMMUNITY_URL o adulto fecha como indisponível e o Kids segue', async () => {
    const closed = new RedeemScholarshipService(
      repo,
      gateway,
      { ...OPTS, giftOffers: catalog, communityUrl: null },
      silentLogger,
    )
    expect(await closed.giftAvailability('adult')).toBe('unavailable')
    expect((await closed.execute(adultInput)).kind).toBe('gift_unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.calls).toHaveLength(0)
    expect((await closed.execute({ ...adultInput, code: 'marta-kd23' })).kind).toBe('completed')
  })

  test('resgate adulto ANTIGO (trial): Mural adulto exige o lote completo', async () => {
    await repo.insertRedemption({
      audience: 'adult',
      codeId: repo.codes.find((c) => c.code === 'marta-ad45')!.id,
      email: 'ana@example.com',
      name: 'Ana Souza',
      phone: null,
      courseSlug: 'cade-todo-mundo-adulto',
    })
    gateway.muralTrialResult = { status: 200, body: { ok: true, granted: 1 } }
    expect((await service.execute(adultInput)).kind).toBe('upstream_error')
    expect(repo.redemptions[0]?.lastError).toBe('mural-grant:200')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
    expect(gateway.callsOf('grantManualCourse')[0]?.input).toMatchObject({
      courseRef: 'cade-todo-mundo-adulto',
      audience: 'adult',
    })
    gateway.muralTrialResult = { status: 200, body: { ok: true, deduped: true } }
    expect((await service.execute(adultInput)).kind).toBe('completed')
    expect(isMuralTrialGranted({ status: 200, body: { ok: true, granted: 2 } })).toBe(true)
  })

  test('curso adulto não publicado → 503 antes de criar conta', async () => {
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(adultInput)).kind).toBe('gift_unavailable')
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('oferta Kids no lugar da adulta fecha o presente adulto', async () => {
    catalog.offers = [
      KIDS_GIFT_OFFER,
      { ...KIDS_GIFT_OFFER, offerSlug: 'cade-todo-mundo-adulto-7-dias' },
    ]
    expect((await service.execute(adultInput)).kind).toBe('gift_unavailable')
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('retomada conserva a oferta GRAVADA no resgate', async () => {
    gateway.grantResult = { status: 502, body: {} }
    expect((await service.execute(adultInput)).kind).toBe('upstream_error')
    // A oferta padrão muda no catálogo; o resgate em andamento segue com a gravada.
    const other = catalog.add({
      ...ADULT_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d0a',
      offerSlug: 'outra-oferta',
    })
    catalog.offers = catalog.offers.filter((o) => o !== ADULT_GIFT_OFFER)
    catalog.add({ ...ADULT_GIFT_OFFER, offerSlug: 'cade-todo-mundo-adulto-7-dias' })
    gateway.grantResult = { status: 200, body: { ok: true, granted: 3 } }
    expect((await service.execute(adultInput)).kind).toBe('completed')
    const grants = gateway.callsOf('grantManualOffer')
    expect(grants.map((g) => (g.input as { offerRef: string }).offerRef)).toEqual([
      ADULT_GIFT_OFFER.offerId,
      ADULT_GIFT_OFFER.offerId,
    ])
    expect(other.offerId).not.toBe(ADULT_GIFT_OFFER.offerId)
  })
})

describe('presente adulto: código do embaixador', () => {
  test('nasce sob demanda, idempotente, e re-sorteia em colisão', async () => {
    const repo = new InMemoryReferralRepository()
    const created = await repo.createAmbassadorWithCode({
      name: 'Marta Lima',
      email: 'marta@example.com',
      pageToken: TOKEN,
      code: 'marta-kd23',
    })
    if (created.kind !== 'created') throw new Error('seed')
    repo.failNextEnsureCode = true
    const first = await ensureAmbassadorShareCode(repo, created.ambassador, 'adult')
    const again = await ensureAmbassadorShareCode(repo, created.ambassador, 'adult')
    expect(first?.audience).toBe('adult')
    expect(first?.code).toMatch(/^marta-[a-z0-9]{4}$/)
    expect(again?.id).toBe(first?.id)
    expect(repo.codes.filter((c) => c.ambassadorId === created.ambassador.id)).toHaveLength(2)
    expect(
      await ensureAmbassadorShareCode(repo, { id: crypto.randomUUID(), name: 'X' }, 'adult'),
    ).toBeNull()
  })

  test('shareUrls: Kids de sempre + adulto; embaixador desativado não ganha código novo', async () => {
    const repo = new InMemoryReferralRepository()
    const ambassadors = new AmbassadorAdminService(
      repo,
      new FakeReferralsGateway(),
      { funnelPublicUrl: FUNNEL, adultGiftEnabled: true },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Marta Lima',
      email: 'marta@example.com',
      pageToken: TOKEN,
      code: 'marta-kd23',
    })
    if (created.kind !== 'created') throw new Error('seed')
    const view = { ...created.ambassador, code: created.code.code }
    const urls = await ambassadors.shareUrls(view)
    expect(urls.kids).toBe(`${FUNNEL}/bolsa/marta-kd23`)
    const adultCode = repo.codes.find((c) => c.audience === 'adult')!
    expect(urls.adult).toBe(`${FUNNEL}/bolsa/${adultCode.code}`)
    expect(await ambassadors.shareUrls(view)).toEqual(urls)

    const other = await repo.createAmbassadorWithCode({
      name: 'Rui',
      email: 'rui@example.com',
      pageToken: 'r'.repeat(43),
      code: 'rui-kd23',
    })
    if (other.kind !== 'created') throw new Error('seed')
    expect(
      await ambassadors.shareUrls({ ...other.ambassador, status: 'disabled', code: 'rui-kd23' }),
    ).toEqual({ kids: `${FUNNEL}/bolsa/rui-kd23`, adult: null })
    expect(repo.codes.filter((c) => c.ambassadorId === other.ambassador.id)).toHaveLength(1)
  })

  test('shareUrls sem o presente adulto configurado: adulto null e nenhum código novo', async () => {
    const repo = new InMemoryReferralRepository()
    const ambassadors = new AmbassadorAdminService(
      repo,
      new FakeReferralsGateway(),
      { funnelPublicUrl: FUNNEL, adultGiftEnabled: false },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Marta Lima',
      email: 'marta@example.com',
      pageToken: TOKEN,
      code: 'marta-kd23',
    })
    if (created.kind !== 'created') throw new Error('seed')
    expect(await ambassadors.shareUrls({ ...created.ambassador, code: 'marta-kd23' })).toEqual({
      kids: `${FUNNEL}/bolsa/marta-kd23`,
      adult: null,
    })
    expect(repo.codes.filter((c) => c.audience === 'adult')).toHaveLength(0)
  })

  test('detalhe do admin e estatísticas somam os resgates dos dois códigos', async () => {
    const repo = new InMemoryReferralRepository()
    const { ambassador, code, adultCode } = await seedAmbassador(repo)
    for (const [codeId, audience] of [
      [code.id, 'kids'],
      [adultCode.id, 'adult'],
    ] as const) {
      const { redemption } = await repo.insertRedemption({
        codeId,
        audience,
        email: 'ana@example.com',
        name: 'Ana',
        phone: null,
      })
      await repo.markRedemptionGranted(redemption.id, new Date())
    }
    const admin = new AmbassadorAdminService(
      repo,
      new FakeReferralsGateway(),
      { funnelPublicUrl: FUNNEL, adultGiftEnabled: true },
      silentLogger,
    )
    expect((await admin.detail(ambassador.id))?.redemptions).toHaveLength(2)
    expect((await repo.findAmbassadorByToken(TOKEN))?.stats.redemptionsCompleted).toBe(2)
    expect((await repo.findAmbassadorByToken(TOKEN))?.code).toBe('marta-kd23')
    expect((await repo.getAmbassadorStats(ambassador.id)).redemptionsCompleted).toBe(2)
  })
})

describe('presente adulto: convite por e-mail', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let service: CreateInviteService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new CreateInviteService(
      repo,
      gateway,
      { funnelPublicUrl: FUNNEL, dailyLimit: 10, adultGiftEnabled: true },
      silentLogger,
    )
    await repo.createAmbassadorWithCode({
      name: 'Marta Lima',
      email: 'marta@example.com',
      pageToken: TOKEN,
      code: 'marta-kd23',
    })
  })

  test('adulto: cria o código adulto se faltar e manda o template adulto', async () => {
    const result = await service.execute({
      pageToken: TOKEN,
      name: 'Ana Souza',
      email: 'ana@example.com',
      audience: 'adult',
    })
    expect(result.kind).toBe('sent')
    const adultCode = repo.codes.find((c) => c.audience === 'adult')!
    expect(repo.invites[0]?.codeId).toBe(adultCode.id)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-invite-adult')
    expect(email.variables).toEqual({
      nome: 'Ana',
      indicador: 'Marta',
      link: `${FUNNEL}/bolsa/${adultCode.code}`,
    })
  })

  test('adulto sem o presente configurado: recusa sem criar código nem enviar', async () => {
    const closed = new CreateInviteService(
      repo,
      gateway,
      { funnelPublicUrl: FUNNEL, dailyLimit: 10, adultGiftEnabled: false },
      silentLogger,
    )
    const result = await closed.execute({
      pageToken: TOKEN,
      name: 'Ana Souza',
      email: 'ana@example.com',
      audience: 'adult',
    })
    expect(result.kind).toBe('gift_unavailable')
    expect(repo.codes.filter((c) => c.audience === 'adult')).toHaveLength(0)
    expect(repo.invites).toHaveLength(0)
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
    // O Kids segue.
    expect(
      (await closed.execute({ pageToken: TOKEN, name: 'Ana', email: 'ana@example.com' })).kind,
    ).toBe('sent')
  })

  test('sem público continua Kids; "já resgatou" é por público', async () => {
    const kidsCode = repo.codes[0]!
    const { redemption } = await repo.insertRedemption({
      codeId: kidsCode.id,
      audience: 'kids',
      email: 'ana@example.com',
      name: 'Ana',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, new Date())
    expect(
      (await service.execute({ pageToken: TOKEN, name: 'Ana', email: 'ana@example.com' })).kind,
    ).toBe('already_redeemed')
    expect(
      (
        await service.execute({
          pageToken: TOKEN,
          name: 'Ana',
          email: 'ana@example.com',
          audience: 'adult',
        })
      ).kind,
    ).toBe('sent')
  })
})

describe('presente adulto: campanhas', () => {
  const now = new Date()
  const base: CampaignInput = {
    name: 'Feira adulta',
    publicTitle: 'Feira de jogos',
    description: '',
    context: 'event',
    code: 'feira-adulta',
    startsAt: new Date(now.getTime() - 60_000).toISOString(),
    endsAt: new Date(now.getTime() + 3_600_000).toISOString(),
    status: 'draft',
    channel: 'feira',
    giftOfferId: KIDS_GIFT_OFFER.offerId,
  }
  const ADULT = { audience: 'adult', giftOfferId: ADULT_GIFT_OFFER.offerId } as const

  function setup() {
    const referrals = new InMemoryReferralRepository()
    const repo = new InMemoryCampaignRepository(referrals)
    const admin = new CampaignAdminService(
      repo,
      referrals,
      FUNNEL,
      undefined,
      undefined,
      new FakeGiftOfferCatalog(),
    )
    return { referrals, repo, admin }
  }

  test('validação: ausente = kids; público desconhecido é recusado', () => {
    expect(validateCampaignInput(base).audience).toBe('kids')
    expect(validateCampaignInput({ ...base, audience: 'adult' }).audience).toBe('adult')
    expect(() => validateCampaignInput({ ...base, audience: 'pro' as unknown as 'adult' })).toThrow(
      CampaignValidationError,
    )
  })

  test('rascunho troca o público; publicada trava (409); edição sem o campo mantém', async () => {
    const { admin, referrals } = setup()
    const created = await admin.create({ ...base, ...ADULT }, 'Operador')
    expect(created?.audience).toBe('adult')
    expect(referrals.codes[0]?.audience).toBe('adult')

    const kids = await admin.update(
      created!.id,
      { ...base, audience: 'kids', expectedUpdatedAt: created!.updatedAt },
      'Operador',
    )
    expect(kids?.audience).toBe('kids')
    const active = await admin.update(
      created!.id,
      { ...base, ...ADULT, status: 'active', expectedUpdatedAt: kids!.updatedAt },
      'Operador',
    )
    expect(active?.audience).toBe('adult')
    expect(referrals.codes[0]?.audience).toBe('adult')

    try {
      await admin.update(
        created!.id,
        { ...base, status: 'active', audience: 'kids', expectedUpdatedAt: active!.updatedAt },
        'Operador',
      )
      throw new Error('deveria travar')
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignAudienceLockedError)
    }
    // Cliente antigo (sem os campos) não esbarra na trava: mantém o público e a oferta.
    const { giftOfferId: _omitida, ...semOferta } = base
    const legacy = await admin.update(
      created!.id,
      { ...semOferta, status: 'paused', expectedUpdatedAt: active!.updatedAt },
      'Operador',
    )
    expect(legacy?.audience).toBe('adult')
    expect(legacy?.giftOfferId).toBe(ADULT_GIFT_OFFER.offerId)
    const history = (await admin.detail(created!.id))?.history ?? []
    expect(history.some((h) => h.changes.audience === 'kids')).toBe(true)
  })

  test('rascunho que já teve cadastro mantém o público travado', async () => {
    const { admin, referrals } = setup()
    const created = await admin.create({ ...base, status: 'active' }, 'Operador')
    await referrals.insertRedemption({
      codeId: referrals.codes[0]!.id,
      audience: 'kids',
      email: 'ana@example.com',
      name: 'Ana',
      phone: null,
    })
    const draft = await admin.update(
      created!.id,
      { ...base, status: 'draft', expectedUpdatedAt: created!.updatedAt },
      'Operador',
    )
    expect(draft?.status).toBe('draft')
    await expect(
      admin.update(
        created!.id,
        { ...base, ...ADULT, expectedUpdatedAt: draft!.updatedAt },
        'Operador',
      ),
    ).rejects.toBeInstanceOf(CampaignAudienceLockedError)
    expect(referrals.codes[0]?.audience).toBe('kids')
  })

  test('duplicar mantém o público da original (ou o escolhido no corpo)', async () => {
    const { admin } = setup()
    const original = await admin.create({ ...base, ...ADULT, status: 'active' }, 'Op')
    // Sem público nem oferta no corpo: herda os dois da original.
    const { giftOfferId: _omitida, ...semOferta } = base
    const copy = await admin.create({ ...semOferta, code: 'feira-adulta-2' }, 'Op', original!.id)
    expect(copy?.audience).toBe('adult')
    expect(copy?.giftOfferId).toBe(ADULT_GIFT_OFFER.offerId)
    const kids = await admin.create(
      { ...base, code: 'feira-kids-3', audience: 'kids' },
      'Op',
      original!.id,
    )
    expect(kids?.audience).toBe('kids')
  })

  test('resgate de campanha adulta usa o público da campanha e os e-mails adultos', async () => {
    const { admin, referrals, repo } = setup()
    await admin.create({ ...base, ...ADULT, status: 'active' }, 'Op')
    const gateway = new FakeReferralsGateway()
    const redeem = new RedeemScholarshipService(
      referrals,
      gateway,
      { ...OPTS, giftOffers: new FakeGiftOfferCatalog(), campaigns: repo },
      silentLogger,
    )
    const result = await redeem.execute({
      code: 'feira-adulta',
      name: 'Ana Souza',
      email: 'ana@example.com',
    })
    expect(result.kind).toBe('completed')
    expect(referrals.redemptions[0]?.audience).toBe('adult')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-campaign-welcome-adult')
    expect(email.variables).toMatchObject({ campanha: 'Feira de jogos', nome: 'Ana' })
    expect(email.variables.validade).not.toBe('')
  })
})

describe('presente adulto: conversões', () => {
  const PAID_AT = new Date('2026-10-25T12:00:00.000Z')
  const payment: PaymentSnapshot = {
    id: 'pay-adulto',
    status: 'PAID',
    amountInCents: 4700n,
    paidAt: PAID_AT,
    customer: { email: 'ana@example.com' },
    metadata: { offerId: 'offer-adulto', billingAudience: 'adult' },
    subscriptionId: null,
  }
  const DEFAULTS = { amounts: null, legacyCents: 3000, windowDays: 45 }

  function serviceFor(repo: InMemoryReferralRepository, slugs: string[]) {
    return new RecordConversionService(
      repo,
      new InMemoryAcquisitionRepository(repo),
      new InMemoryCampaignRepository(repo),
      { getPayment: async () => payment, getSubscriptionCreatedAt: async () => null },
      {
        getOfferById: async () => ({
          id: 'offer-adulto',
          slug: 'comunidade-dos-criadores-adulto-mensal',
          name: 'Comunidade adulta',
          audience: 'adult',
        }),
      },
      { conversionOfferSlugs: slugs, bonusAmountCents: 3000, matureHours: 180 },
      silentLogger,
    )
  }

  /** O presente concluído vira aquisição, como o resgate faz. */
  async function giftFor(
    repo: InMemoryReferralRepository,
    codeId: string,
    audience: 'kids' | 'adult',
  ) {
    const { redemption } = await repo.insertRedemption({
      codeId,
      audience,
      email: 'ana@example.com',
      name: 'Ana',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, PAID_AT)
    redemption.createdAt = new Date(PAID_AT.getTime() - 86_400_000)
    const code = repo.codes.find((c) => c.id === codeId)!
    await new InMemoryAcquisitionRepository(repo).insert(
      giftAcquisition(redemption, code, redemption.createdAt, DEFAULTS),
    )
    return redemption
  }

  test('assinatura adulta credita o presente adulto do e-mail', async () => {
    const repo = new InMemoryReferralRepository()
    const { ambassador, code, adultCode } = await seedAmbassador(repo)
    await giftFor(repo, code.id, 'kids')
    const adultRedemption = await giftFor(repo, adultCode.id, 'adult')
    const service = serviceFor(repo, [
      'comunidade-dos-criadores-mensal',
      'comunidade-dos-criadores-adulto-mensal',
    ])
    const out = await service.execute({
      deliveryId: 'd-1',
      eventName: 'payment.paid',
      payload: { paymentId: 'pay-adulto' },
    })
    expect(out.kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]).toMatchObject({
      redemptionId: adultRedemption.id,
      codeId: adultCode.id,
      ambassadorId: ambassador.id,
      audience: 'adult',
      status: 'pending',
      bonusCents: 3000,
    })
  })

  test('sem presente do público da oferta, conta o presente do outro público', async () => {
    const repo = new InMemoryReferralRepository()
    const { code } = await seedAmbassador(repo)
    const redemption = await giftFor(repo, code.id, 'kids')
    const service = serviceFor(repo, ['comunidade-dos-criadores-adulto-mensal'])
    await service.execute({
      deliveryId: 'd-2',
      eventName: 'payment.paid',
      payload: { paymentId: 'pay-adulto' },
    })
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]).toMatchObject({ redemptionId: redemption.id, codeId: code.id })
  })

  test('o público da oferta sai do slug do catálogo', () => {
    expect(offerGiftAudience('comunidade-dos-criadores-adulto-mensal')).toBe('adult')
    expect(offerGiftAudience('comunidade-dos-criadores-adulto-anual')).toBe('adult')
    expect(offerGiftAudience('comunidade-dos-criadores-mensal')).toBe('kids')
  })
})

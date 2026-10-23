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
import { CampaignAudienceLockedError, CampaignValidationError } from '../../src/domain/campaign'
import { isMuralTrialGranted, offerGiftAudience } from '../../src/domain/gift-policy'
import type { PaymentSnapshot } from '../../src/domain/ports/clients.port'
import type { GrantManualCourseInput, SendEmailInput } from '../../src/domain/ports/gateway.port'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const FUNNEL = 'https://sistemazero.com.br'
const COMMUNITY = 'https://comunidade.sistemazero.com.br'
const TOKEN = 't'.repeat(43)
const OPTS: RedeemOptions = {
  courseSlug: 'cade-todo-mundo',
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
  let service: RedeemScholarshipService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new RedeemScholarshipService(repo, gateway, OPTS, silentLogger)
    await seedAmbassador(repo)
  })

  const adultInput = { code: 'marta-ad45', name: 'Ana Souza', email: 'ana@example.com' }

  test('conta nova: curso adulto, Mural adulto, e-mail adulto com link do app adulto', async () => {
    const result = await service.execute(adultInput)
    expect(result).toMatchObject({ kind: 'completed', muralAccess: 'trial' })
    const r = repo.redemptions[0]!
    expect(r.audience).toBe('adult')
    expect(r.courseSlug).toBe('cade-todo-mundo-adulto')

    expect(gateway.callsOf('getGiftAvailability')[0]?.input).toEqual({
      courseRef: 'cade-todo-mundo-adulto',
      audience: 'adult',
    })
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant).toMatchObject({
      courseRef: 'cade-todo-mundo-adulto',
      audience: 'adult',
      sourceId: `scholarship:${r.id}`,
      deliveryId: `scholarship:course:cade-todo-mundo-adulto:${r.id}`,
    })
    expect(gateway.callsOf('grantMuralTrial')[0]?.input).toMatchObject({
      courseRef: 'cade-todo-mundo-adulto',
      audience: 'adult',
      expiresAt: grant.expiresAt,
      deliveryId: `scholarship:mural-trial:${r.id}`,
    })
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-adult')
    expect(email.variables).toMatchObject({ nome: 'Ana', indicador: 'Marta Lima' })
    expect(email.variables.validade).toContain('2026')
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

  test('pedidos Kids continuam idênticos (sem o campo audience no fio)', async () => {
    await service.execute({ ...adultInput, code: 'marta-kd23' })
    expect(gateway.callsOf('getGiftAvailability')[0]?.input).toEqual({
      courseRef: 'cade-todo-mundo',
    })
    expect(gateway.callsOf('grantManualCourse')[0]?.input).not.toHaveProperty('audience')
    expect(gateway.callsOf('grantMuralTrial')[0]?.input).not.toHaveProperty('audience')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-mural-trial')
    expect(email.variables).not.toHaveProperty('validade')
  })

  test('sem COMMUNITY_URL o adulto fecha como indisponível e o Kids segue', async () => {
    const closed = new RedeemScholarshipService(
      repo,
      gateway,
      { ...OPTS, communityUrl: null },
      silentLogger,
    )
    expect(await closed.giftAvailability('adult')).toBe('unavailable')
    expect((await closed.execute(adultInput)).kind).toBe('gift_unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.calls).toHaveLength(0)
    expect((await closed.execute({ ...adultInput, code: 'marta-kd23' })).kind).toBe('completed')
  })

  test('Mural adulto exige o lote completo (participação + visita), como o Kids', async () => {
    gateway.muralTrialResult = { status: 200, body: { ok: true, granted: 1 } }
    expect((await service.execute(adultInput)).kind).toBe('upstream_error')
    expect(repo.redemptions[0]?.lastError).toBe('mural-grant:200')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
    gateway.muralTrialResult = { status: 200, body: { ok: true, deduped: true } }
    expect((await service.execute(adultInput)).kind).toBe('completed')
    expect(isMuralTrialGranted({ status: 200, body: { ok: true, granted: 2 } })).toBe(true)
  })

  test('curso adulto não publicado → 503 antes de criar conta', async () => {
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(adultInput)).kind).toBe('gift_unavailable')
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('env do curso adulto vale para resgates novos; retomada conserva o curso gravado', async () => {
    const custom = new RedeemScholarshipService(
      repo,
      gateway,
      { ...OPTS, adultCourseSlug: 'cade-todo-mundo-adulto-v2' },
      silentLogger,
    )
    gateway.grantResult = { status: 502, body: {} }
    expect((await custom.execute(adultInput)).kind).toBe('upstream_error')
    expect(repo.redemptions[0]?.courseSlug).toBe('cade-todo-mundo-adulto-v2')
    gateway.grantResult = { status: 200, body: { ok: true, granted: 1 } }
    expect((await service.execute(adultInput)).kind).toBe('completed')
    const grants = gateway.callsOf('grantManualCourse')
    expect((grants[1]!.input as GrantManualCourseInput).courseRef).toBe('cade-todo-mundo-adulto-v2')
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
      indicador: 'Marta Lima',
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
  }

  function setup() {
    const referrals = new InMemoryReferralRepository()
    const repo = new InMemoryCampaignRepository(referrals)
    const admin = new CampaignAdminService(repo, referrals, FUNNEL)
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
    const created = await admin.create({ ...base, audience: 'adult' }, 'Operador')
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
      { ...base, audience: 'adult', status: 'active', expectedUpdatedAt: kids!.updatedAt },
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
    // Cliente antigo (sem o campo) não esbarra na trava: mantém o público gravado.
    const legacy = await admin.update(
      created!.id,
      { ...base, status: 'paused', expectedUpdatedAt: active!.updatedAt },
      'Operador',
    )
    expect(legacy?.audience).toBe('adult')
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
        { ...base, audience: 'adult', expectedUpdatedAt: draft!.updatedAt },
        'Operador',
      ),
    ).rejects.toBeInstanceOf(CampaignAudienceLockedError)
    expect(referrals.codes[0]?.audience).toBe('kids')
  })

  test('duplicar mantém o público da original (ou o escolhido no corpo)', async () => {
    const { admin } = setup()
    const original = await admin.create({ ...base, audience: 'adult', status: 'active' }, 'Op')
    const copy = await admin.create({ ...base, code: 'feira-adulta-2' }, 'Op', original!.id)
    expect(copy?.audience).toBe('adult')
    const kids = await admin.create(
      { ...base, code: 'feira-kids-3', audience: 'kids' },
      'Op',
      original!.id,
    )
    expect(kids?.audience).toBe('kids')
  })

  test('resgate de campanha adulta usa o público da campanha e os e-mails adultos', async () => {
    const { admin, referrals, repo } = setup()
    await admin.create({ ...base, audience: 'adult', status: 'active' }, 'Op')
    const gateway = new FakeReferralsGateway()
    const redeem = new RedeemScholarshipService(
      referrals,
      gateway,
      { ...OPTS, campaigns: repo },
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
    metadata: { offerId: 'offer-adulto' },
    subscriptionId: null,
  }

  test('assinatura adulta credita o resgate adulto do e-mail', async () => {
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
      await repo.markRedemptionGranted(redemption.id, PAID_AT)
      redemption.createdAt = new Date(PAID_AT.getTime() - 86_400_000)
    }
    const service = new RecordConversionService(
      repo,
      {
        getPayment: async () => payment,
        getSubscriptionCreatedAt: async () => null,
      },
      {
        getOfferById: async () => ({
          id: 'offer-adulto',
          slug: 'comunidade-dos-criadores-adulto-mensal',
          name: 'Comunidade adulta',
        }),
      },
      {
        conversionOfferSlugs: [
          'comunidade-dos-criadores-mensal',
          'comunidade-dos-criadores-adulto-mensal',
        ],
        bonusAmountCents: 3000,
        matureHours: 180,
      },
      silentLogger,
    )
    const out = await service.execute({
      deliveryId: 'd-1',
      eventName: 'payment.paid',
      payload: { paymentId: 'pay-adulto' },
    })
    expect(out.kind).toBe('ok')
    const adultRedemption = repo.redemptions.find((r) => r.audience === 'adult')!
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]).toMatchObject({
      redemptionId: adultRedemption.id,
      codeId: adultCode.id,
      ambassadorId: ambassador.id,
      status: 'pending',
      bonusCents: 3000,
    })
  })

  test('sem resgate do público da oferta, conta o resgate do outro público', async () => {
    const repo = new InMemoryReferralRepository()
    const { code } = await seedAmbassador(repo)
    const { redemption } = await repo.insertRedemption({
      codeId: code.id,
      audience: 'kids',
      email: 'ana@example.com',
      name: 'Ana',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, PAID_AT)
    redemption.createdAt = new Date(PAID_AT.getTime() - 86_400_000)
    const service = new RecordConversionService(
      repo,
      { getPayment: async () => payment, getSubscriptionCreatedAt: async () => null },
      {
        getOfferById: async () => ({
          id: 'offer-adulto',
          slug: 'comunidade-dos-criadores-adulto-mensal',
          name: 'Comunidade adulta',
        }),
      },
      {
        conversionOfferSlugs: ['comunidade-dos-criadores-adulto-mensal'],
        bonusAmountCents: 3000,
        matureHours: 180,
      },
      silentLogger,
    )
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

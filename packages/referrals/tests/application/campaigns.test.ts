import { describe, expect, test } from 'bun:test'
import type { CampaignInput } from '@sistemazero/core/referrals'
import { sanitizeGiftAttribution } from '@sistemazero/core/referrals'
import {
  CampaignAdminService,
  validateCampaignInput,
} from '../../src/application/campaigns/campaign-admin.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import {
  CampaignGiftOfferLockedError,
  CampaignUnavailableError,
  CampaignValidationError,
  campaignState,
} from '../../src/domain/campaign'
import type { GrantManualOfferInput, SendEmailInput } from '../../src/domain/ports/gateway.port'
import { memberGiftRoutes } from '../../src/interfaces/http/member-gifts.routes'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import {
  ADULT_GIFT_OFFER,
  FakeGiftOfferCatalog,
  FakeReferralsGateway,
  InMemoryReferralRepository,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

const current = new Date()
const input: CampaignInput = {
  name: 'Palestra interna',
  publicTitle: 'Encontro das famílias',
  description: 'Um convite para experimentar em casa.',
  context: 'event',
  code: 'encontro-outubro',
  startsAt: new Date(current.getTime() - 60_000).toISOString(),
  endsAt: new Date(current.getTime() + 60_000).toISOString(),
  status: 'active',
  channel: 'palestra',
  giftOfferId: KIDS_GIFT_OFFER.offerId,
}
/** Oferta vitalícia, sem o Mural, de um curso para pais (Kids). */
const PARENTS_OFFER = {
  ...KIDS_GIFT_OFFER,
  offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d05',
  offerSlug: 'vilao-em-aliado',
  name: 'Transformando o vilão em aliado',
  accessMode: 'lifetime' as const,
  accessDurationValue: null,
  accessDurationUnit: null,
  courseSlug: 'vilao-em-aliado',
  includesMural: false,
}
async function setup() {
  const referrals = new InMemoryReferralRepository()
  const campaigns = new InMemoryCampaignRepository(referrals)
  const gateway = new FakeReferralsGateway()
  const catalog = new FakeGiftOfferCatalog()
  catalog.add(PARENTS_OFFER)
  const admin = new CampaignAdminService(
    campaigns,
    referrals,
    'https://sistemazero.com.br',
    undefined,
    undefined,
    catalog,
  )
  const campaign = await admin.create(input, 'Operador')
  if (!campaign) throw new Error('seed')
  const redeem = new RedeemScholarshipService(
    referrals,
    gateway,
    {
      campaigns,
      giftOffers: catalog,
      kidsCommunityUrl: 'https://kids.sistemazero.com.br',
      leaseMs: 90_000,
    },
    silentLogger,
  )
  return { referrals, campaigns, gateway, admin, campaign, redeem, catalog }
}
const family = { code: input.code, email: 'responsavel@example.com', name: 'Responsável' }

describe('campanhas institucionais', () => {
  test('R05: inspeção autenticada recupera o resgate após encerramento sem novos efeitos', async () => {
    const { redeem, admin, campaign, referrals, gateway } = await setup()
    const account = {
      userId: '00000000-0000-4000-8000-000000000123',
      audience: 'kids' as const,
      email: family.email,
      name: family.name,
    }
    gateway.grantResult = { status: 502, body: {} }
    expect((await redeem.execute(family, account)).kind).toBe('upstream_error')
    const accepted = referrals.redemptions[0]!.createdAt.toISOString()
    await admin.update(
      campaign.id,
      { ...input, status: 'ended', expectedUpdatedAt: campaign.updatedAt },
      'Operador',
    )
    const app = memberGiftRoutes({
      repo: referrals,
      redeem,
      campaigns: admin,
      internalToken: 'secret',
    })
    const send = (action: 'inspect' | 'redeem', actor = account) =>
      app.handle(
        new Request('http://localhost/referrals/internal/member-gifts', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-token': 'secret' },
          body: JSON.stringify({
            action,
            code: input.code,
            account: actor,
            originKind: 'lesson',
            originId: 'aula',
          }),
        }),
      )
    const before = gateway.calls.length
    const inspected = await send('inspect', { ...account, email: 'email-alterado@example.com' })
    expect(inspected.status).toBe(200)
    expect(await inspected.json()).toMatchObject({
      state: 'ended',
      redemption: {
        status: 'pending',
        canResume: true,
        expiresAt: new Date(new Date(accepted).getTime() + 7 * 86400000).toISOString(),
      },
    })
    expect(gateway.calls.length).toBeGreaterThanOrEqual(before)
    expect(gateway.calls.slice(before).every((call) => call.kind === 'getGiftAvailability')).toBe(
      true,
    )
    expect(referrals.redemptions).toHaveLength(1)
    const originalCreatedAt = referrals.redemptions[0]!.createdAt
    referrals.redemptions[0]!.createdAt = new Date(Date.now() - 8 * 86400000)
    expect(await (await send('inspect')).json()).toMatchObject({
      redemption: { status: 'pending', canResume: false },
    })
    referrals.redemptions[0]!.createdAt = originalCreatedAt
    gateway.grantResult = { status: 200, body: {} }
    expect((await send('redeem')).status).toBe(200)
    expect(referrals.redemptions[0]!.createdAt.toISOString()).toBe(accepted)
    expect(await (await send('inspect')).json()).toMatchObject({
      redemption: { status: 'completed', canResume: false },
    })
    const other = {
      ...account,
      userId: '00000000-0000-4000-8000-000000000456',
      email: 'outra@example.com',
    }
    expect(await (await send('inspect', other)).json()).toMatchObject({ redemption: null })
    expect((await send('redeem', other)).status).toBe(410)
  })
  test('data de referência deriva os prazos e PATCH legado mantém calendário', async () => {
    const { admin, campaign } = await setup()
    const schedule = { eventDate: '2026-11-06', giftClaimDays: 3, couponClaimDays: 7 }
    const first = await admin.update(
      campaign.id,
      { ...input, schedule, expectedUpdatedAt: campaign.updatedAt },
      'Admin',
    )
    expect(first).toMatchObject({
      startsAt: '2026-11-06T03:00:00.000Z',
      endsAt: '2026-11-09T03:00:00.000Z',
      schedule,
    })
    const legacy = await admin.update(
      campaign.id,
      { ...input, name: 'Nome alterado', expectedUpdatedAt: first!.updatedAt },
      'Admin',
    )
    expect(legacy?.schedule).toEqual(schedule)
    expect(legacy?.endsAt).toBe(first!.endsAt)
    const moved = await admin.update(
      campaign.id,
      {
        ...input,
        schedule: { ...schedule, eventDate: '2026-11-20' },
        expectedUpdatedAt: legacy!.updatedAt,
      },
      'Admin',
    )
    expect(moved?.endsAt).toBe('2026-11-23T03:00:00.000Z')
  })

  test('presente encerrado não encerra cupom; datas e vínculo do parceiro são independentes', async () => {
    const referrals = new InMemoryReferralRepository()
    const campaigns = new InMemoryCampaignRepository(referrals)
    const ambassador = await new (
      await import('../../src/application/ambassadors/ambassador-admin.service')
    ).AmbassadorAdminService(
      referrals,
      new FakeReferralsGateway(),
      { funnelPublicUrl: 'https://example.test', adultGiftEnabled: true },
      silentLogger,
    ).create({ name: 'Pessoa', email: 'pessoa@example.test' })
    if (ambassador.kind !== 'created') throw new Error('Expected a new ambassador')
    const link = {
      couponId: '22222222-2222-4222-8222-222222222222',
      offerId: '33333333-3333-4333-8333-333333333333',
    }
    const catalog = {
      async get() {
        return {
          ...link,
          code: 'EVENTO50',
          offerSlug: 'desafio',
          offerName: 'Desafio',
          percentOff: 50,
          amountOffCents: null,
          currency: 'BRL',
          accessMode: 'fixed',
          accessDurationValue: 30,
          accessDurationUnit: 'days',
          available: true,
        }
      },
    }
    const admin = new CampaignAdminService(
      campaigns,
      referrals,
      'https://example.test',
      () => new Date('2026-11-10T12:00:00Z'),
      catalog,
      new FakeGiftOfferCatalog(),
    )
    const created = await admin.create(
      {
        ...input,
        ambassadorId: ambassador.ambassador.id,
        schedule: { eventDate: '2026-11-06', giftClaimDays: 3, couponClaimDays: 7 },
      },
      'Admin',
    )
    const linked = await admin.update(
      created!.id,
      { ...created!, coupon: link, expectedUpdatedAt: created!.updatedAt },
      'Admin',
    )
    expect(linked).toMatchObject({
      state: 'ended',
      couponView: { state: 'active', endsAt: '2026-11-13T03:00:00.000Z' },
    })
    const panel = await admin.forAmbassador(ambassador.ambassador.id)
    expect(panel.items[0]?.couponView?.shareUrl).toContain('event_code=encontro-outubro')
    const moved = await admin.update(
      created!.id,
      {
        ...linked!,
        schedule: { ...created!.schedule!, eventDate: '2026-11-20' },
        expectedUpdatedAt: linked!.updatedAt,
      },
      'Admin',
    )
    expect(moved?.couponView?.state).toBe('scheduled')
    expect(await admin.couponPolicy(created!.id)).toMatchObject({
      startsAt: '2026-11-20T03:00:00.000Z',
      endsAt: '2026-11-27T03:00:00.000Z',
      ...link,
    })
    expect((await admin.forAmbassador('another-person')).items).toHaveLength(0)
  })
  test('comissão anual valida centavos inteiros positivos e desabilitar limpa os valores', () => {
    const agreement = {
      ...input,
      ambassadorId: '11111111-1111-4111-8111-111111111111',
      commissionEnabled: true,
      commissionAmountCents: 3000,
      commissionWindowDays: 30,
    }
    for (const commissionAnnualAmountCents of [0, -1, 1.5, 100_000_001])
      expect(() => validateCampaignInput({ ...agreement, commissionAnnualAmountCents })).toThrow()
    expect(
      validateCampaignInput({ ...agreement, commissionAnnualAmountCents: 8000 }),
    ).toMatchObject({ commissionAnnualAmountCents: 8000 })
    expect(
      validateCampaignInput({
        ...agreement,
        commissionAnnualAmountCents: 8000,
        commissionEnabled: false,
      }),
    ).toMatchObject({ commissionAmountCents: null, commissionAnnualAmountCents: null })
    expect(validateCampaignInput(agreement).commissionAnnualAmountCents).toBeNull()
  })
  test('comissão exige beneficiário, valor positivo inteiro e prazo independente', () => {
    for (const change of [
      { commissionEnabled: true },
      { ambassadorId: 'not-an-id' },
      {
        ambassadorId: '11111111-1111-4111-8111-111111111111',
        commissionEnabled: true,
        commissionAmountCents: 0,
        commissionWindowDays: 30,
      },
      {
        ambassadorId: '11111111-1111-4111-8111-111111111111',
        commissionEnabled: true,
        commissionAmountCents: 3000,
        commissionWindowDays: 0,
      },
    ])
      expect(() => validateCampaignInput({ ...input, ...change })).toThrow()
  })

  test('vínculo sem comissão e edição de cliente antigo preservam o acordo', async () => {
    const { admin, referrals } = await setup()
    const created = await referrals.createAmbassadorWithCode({
      name: 'Viviane',
      email: 'viviane@example.com',
      pageToken: 'v'.repeat(43),
      code: 'viviane-laopa',
    })
    if (created.kind !== 'created') throw new Error('seed')
    const linked = await admin.create(
      {
        ...input,
        code: 'laopa-palestra',
        ambassadorId: created.ambassador.id,
        commissionEnabled: true,
        commissionAmountCents: 4500,
        commissionAnnualAmountCents: 8500,
        commissionWindowDays: 30,
      },
      'Operador',
    )
    expect(linked?.commissionEnabled).toBe(true)
    const updated = await admin.update(
      linked!.id,
      { ...input, code: linked!.code, expectedUpdatedAt: linked!.updatedAt },
      'Operador',
    )
    expect(updated).toMatchObject({
      ambassadorId: created.ambassador.id,
      commissionEnabled: true,
      commissionAmountCents: 4500,
      commissionAnnualAmountCents: 8500,
      commissionWindowDays: 30,
    })
    const unlinked = await admin.update(
      linked!.id,
      { ...input, code: linked!.code, ambassadorId: null, expectedUpdatedAt: updated!.updatedAt },
      'Operador',
    )
    expect(unlinked).toMatchObject({
      ambassadorId: null,
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionAnnualAmountCents: null,
      commissionWindowDays: null,
    })
    const disabled = await admin.update(
      linked!.id,
      { ...updated!, commissionEnabled: false, expectedUpdatedAt: unlinked!.updatedAt },
      'Operador',
    )
    expect(disabled).toMatchObject({
      ambassadorId: created.ambassador.id,
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionWindowDays: null,
    })
    created.ambassador.status = 'disabled'
    const paused = await admin.update(
      linked!.id,
      { ...disabled!, status: 'paused', expectedUpdatedAt: disabled!.updatedAt },
      'Operador',
    )
    expect(paused?.status).toBe('paused')
    await expect(
      admin.update(
        linked!.id,
        { ...paused!, status: 'active', expectedUpdatedAt: paused!.updatedAt },
        'Operador',
      ),
    ).rejects.toThrow()
  })

  test('não aceita beneficiário inexistente ou desativado', async () => {
    const { admin, referrals } = await setup()
    await expect(
      admin.create(
        { ...input, code: 'laopa-palestra', ambassadorId: '11111111-1111-4111-8111-111111111111' },
        'Operador',
      ),
    ).rejects.toThrow()
    const created = await referrals.createAmbassadorWithCode({
      name: 'Viviane',
      email: 'viviane@example.com',
      pageToken: 'v'.repeat(43),
      code: 'viviane-laopa',
    })
    if (created.kind !== 'created') throw new Error('seed')
    created.ambassador.status = 'disabled'
    await expect(
      admin.create(
        { ...input, code: 'laopa-palestra', ambassadorId: created.ambassador.id },
        'Operador',
      ),
    ).rejects.toThrow()
  })
  test('limites exatos: início inclusivo, fim exclusivo; pausa e rascunho fecham', () => {
    const base = {
      status: 'active' as const,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
    }
    expect(campaignState(base, new Date(base.startsAt.getTime() - 1))).toBe('scheduled')
    expect(campaignState(base, base.startsAt)).toBe('active')
    expect(campaignState(base, base.endsAt)).toBe('ended')
    expect(campaignState({ ...base, status: 'paused' }, current)).toBe('paused')
    expect(campaignState({ ...base, status: 'draft' }, current)).toBe('draft')
  })
  test('datas com fuso obrigatório, ordem e código são validados', () => {
    expect(() => validateCampaignInput({ ...input, startsAt: '2026-10-02T10:00' })).toThrow()
    expect(() => validateCampaignInput({ ...input, endsAt: input.startsAt })).toThrow()
    expect(() => validateCampaignInput({ ...input, code: 'a/b' })).toThrow()
    expect(() => validateCampaignInput({ ...input, code: 'previa' })).toThrow()
  })
  test('campanha não cria pessoa; código exclusivo, edição auditada e duplicação isolada', async () => {
    const { admin, referrals, campaign } = await setup()
    expect(referrals.ambassadors).toHaveLength(0)
    expect(await admin.create(input, 'Operador')).toBeNull()
    await expect(
      admin.update(
        campaign.id,
        { ...input, code: 'outro-link', expectedUpdatedAt: campaign.updatedAt },
        'Operador',
      ),
    ).rejects.toThrow()
    await admin.update(
      campaign.id,
      { ...input, status: 'paused', expectedUpdatedAt: campaign.updatedAt },
      'Outro operador',
    )
    const copy = await admin.create(
      { ...input, code: 'encontro-novembro', status: 'draft' },
      'Operador',
      campaign.id,
    )
    expect(copy?.id).not.toBe(campaign.id)
    expect(copy?.stats.redemptions).toBe(0)
    const detail = await admin.detail(campaign.id)
    expect(detail?.history[0]?.actor).toBe('Outro operador')
    expect(detail?.campaign.state).toBe('paused')
  })
  test('resgate grava origem pública, curso, prazo próprio e mídia; template institucional', async () => {
    const { redeem, referrals, gateway } = await setup()
    const result = await redeem.execute({
      ...family,
      attribution: {
        utmSource: 'instagram',
        utmCampaign: 'palestra-10',
        utmMedium: 'paid',
        utmContent: null,
      },
    })
    expect(result.kind).toBe('completed')
    const row = referrals.redemptions[0]!
    expect(row.sourceSnapshot?.name).toBe(input.publicTitle)
    expect(row.courseSlug).toBe('cade-todo-mundo')
    expect(row.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
    expect(row.attribution?.utmSource).toBe('instagram')
    const grant = gateway.callsOf('grantManualOffer')[0]!.input as GrantManualOfferInput
    expect(grant.offerRef).toBe(KIDS_GIFT_OFFER.offerId)
    expect(grant.anchorAt).toBe(row.createdAt.toISOString())
    expect(result).toMatchObject({
      expiresAt: new Date(row.createdAt.getTime() + 7 * 86_400_000).toISOString(),
    })
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).templateKey).toBe(
      'referrals-campaign-welcome-mural-trial',
    )
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).variables.campanha).toBe(
      input.publicTitle,
    )
    expect(result).toMatchObject({ emailStatus: 'accepted' })
  })
  test('novos cadastros após pausa/fim não criam conta', async () => {
    const { admin, campaign, redeem, gateway, referrals } = await setup()
    for (const status of ['paused', 'ended', 'draft'] as const) {
      const currentCampaign = await admin.detail(campaign.id)
      await admin.update(
        campaign.id,
        { ...input, status, expectedUpdatedAt: currentCampaign!.campaign.updatedAt },
        'Operador',
      )
      expect((await redeem.execute(family)).kind).toBe(
        status === 'draft' ? 'code_not_found' : 'campaign_unavailable',
      )
    }
    expect(referrals.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })
  test('alteração entre consulta e aceitação é recusada sem efeito externo', async () => {
    const { referrals, gateway, redeem } = await setup()
    referrals.insertRedemption = async () => {
      throw new CampaignUnavailableError('ended')
    }
    expect(await redeem.execute(family)).toEqual({ kind: 'campaign_unavailable', state: 'ended' })
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })
  test('retomada após encerramento conserva título, curso, origem e sete dias originais', async () => {
    const { redeem, admin, campaign, referrals, gateway } = await setup()
    gateway.grantResult = { status: 502, body: {} }
    expect((await redeem.execute(family)).kind).toBe('upstream_error')
    const accepted = referrals.redemptions[0]!.createdAt.toISOString()
    await admin.update(
      campaign.id,
      {
        ...input,
        status: 'ended',
        publicTitle: 'Outro título',
        expectedUpdatedAt: campaign.updatedAt,
      },
      'Operador',
    )
    gateway.grantResult = { status: 200, body: {} }
    expect((await redeem.execute(family)).kind).toBe('completed')
    expect(referrals.redemptions[0]!.createdAt.toISOString()).toBe(accepted)
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).variables.campanha).toBe(
      input.publicTitle,
    )
  })
  test('falha no e-mail informa estado real, mas preserva acesso já concedido', async () => {
    const { gateway, referrals, redeem } = await setup()
    gateway.sendEmailResult = { status: 502, body: {} }
    expect(await redeem.execute(family)).toMatchObject({ kind: 'completed', emailStatus: 'failed' })
    expect(referrals.redemptions[0]!.status).toBe('completed')
    expect(referrals.redemptions[0]!.welcomeAcceptedAt).toBeNull()
  })
  test('aceitação pelo e-mail não vira falha quando o recibo local falha', async () => {
    const { referrals, redeem, gateway } = await setup()
    referrals.markWelcomeAccepted = async () => {
      throw new Error('Banco temporariamente indisponível')
    }
    expect(await redeem.execute(family)).toMatchObject({
      kind: 'completed',
      emailStatus: 'accepted',
    })
    expect((await redeem.execute(family)).kind).toBe('already_redeemed')
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(1)
  })
  test('retomada por outro convite conserva atribuição e curso mesmo após mudar a configuração', async () => {
    const { gateway, referrals, redeem, campaigns } = await setup()
    gateway.grantResult = { status: 502, body: {} }
    await redeem.execute(family)
    const accepted = referrals.redemptions[0]!
    const originalCodeId = accepted.codeId
    await referrals.createAmbassadorWithCode({
      name: 'Outro convite',
      email: 'pessoa@example.com',
      code: 'outro-convite',
      pageToken: 't'.repeat(43),
    })
    gateway.grantResult = { status: 200, body: {} }
    // A oferta padrão do público passa a ser outra; o resgate em andamento conserva a gravada.
    const newCatalog = new FakeGiftOfferCatalog()
    newCatalog.offers = [
      { ...KIDS_GIFT_OFFER, offerSlug: 'oferta-antiga' },
      {
        ...KIDS_GIFT_OFFER,
        offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d0b',
        courseSlug: 'curso-futuro',
      },
    ]
    const newConfiguration = new RedeemScholarshipService(
      referrals,
      gateway,
      {
        campaigns,
        giftOffers: newCatalog,
        kidsCommunityUrl: 'https://kids.sistemazero.com.br',
        leaseMs: 90_000,
      },
      silentLogger,
    )
    expect((await newConfiguration.execute({ ...family, code: 'outro-convite' })).kind).toBe(
      'completed',
    )
    expect(referrals.redemptions).toHaveLength(1)
    expect(referrals.redemptions[0]!.codeId).toBe(originalCodeId)
    const grant = gateway.callsOf('grantManualOffer').at(-1)?.input as GrantManualOfferInput
    expect(grant.offerRef).toBe(KIDS_GIFT_OFFER.offerId)
    expect(grant.deliveryId).toBe(`scholarship:offer:${KIDS_GIFT_OFFER.offerId}:${accepted.id}`)
    expect(referrals.redemptions[0]!.courseSlug).toBe('cade-todo-mundo')
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).variables.campanha).toBe(
      input.publicTitle,
    )
  })
  test('campanha nova sem oferta é recusada; oferta de outro público ou assinatura também', async () => {
    const { admin, catalog } = await setup()
    const { giftOfferId: _omitida, ...semOferta } = input
    for (const body of [
      { ...semOferta, code: 'sem-oferta' },
      { ...input, code: 'oferta-adulta', giftOfferId: ADULT_GIFT_OFFER.offerId },
      { ...input, code: 'oferta-inexistente', giftOfferId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7dff' },
    ])
      await expect(admin.create(body, 'Operador')).rejects.toBeInstanceOf(CampaignValidationError)
    const subscription = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d06',
      offerSlug: 'comunidade-mensal',
      accessMode: 'billing_cycle',
    })
    await expect(
      admin.create({ ...input, code: 'assinatura', giftOfferId: subscription.offerId }, 'Op'),
    ).rejects.toThrow(/pagamento único/)
    expect(() => validateCampaignInput({ ...input, giftOfferId: 'nao-e-uuid' })).toThrow()
  })

  test('oferta em meses vira presente (27/11/2026); arquivada não; pausada serve', async () => {
    const { admin, catalog } = await setup()
    const emMeses = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d07',
      offerSlug: 'cade-todo-mundo-1-mes',
      accessDurationValue: 1,
      accessDurationUnit: 'months',
    })
    const emMesesCriada = await admin.create(
      { ...input, code: 'oferta-em-meses', giftOfferId: emMeses.offerId },
      'Op',
    )
    expect(emMesesCriada?.giftOfferId).toBe(emMeses.offerId)
    const arquivada = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d08',
      offerSlug: 'cade-todo-mundo-arquivada',
      status: 'archived',
    })
    await expect(
      admin.create({ ...input, code: 'oferta-arquivada', giftOfferId: arquivada.offerId }, 'Op'),
    ).rejects.toThrow(/arquivada/)
    const pausada = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d09',
      offerSlug: 'cade-todo-mundo-pausada',
      status: 'paused',
    })
    const created = await admin.create(
      { ...input, code: 'oferta-pausada', giftOfferId: pausada.offerId },
      'Op',
    )
    expect(created?.giftOfferId).toBe(pausada.offerId)
  })

  test('duplicata herda a oferta; troca de oferta trava fora do rascunho e com resgates', async () => {
    const { admin, campaign, referrals, redeem } = await setup()
    const { giftOfferId: _omitida, ...semOferta } = input
    const copy = await admin.create(
      { ...semOferta, code: 'encontro-dezembro', status: 'draft' },
      'Operador',
      campaign.id,
    )
    expect(copy?.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
    // Rascunho sem cadastros troca a oferta; ativa trava.
    const changed = await admin.update(
      copy!.id,
      {
        ...input,
        code: copy!.code,
        status: 'draft',
        giftOfferId: PARENTS_OFFER.offerId,
        expectedUpdatedAt: copy!.updatedAt,
      },
      'Operador',
    )
    expect(changed?.giftOfferId).toBe(PARENTS_OFFER.offerId)
    await expect(
      admin.update(
        campaign.id,
        { ...input, giftOfferId: PARENTS_OFFER.offerId, expectedUpdatedAt: campaign.updatedAt },
        'Operador',
      ),
    ).rejects.toBeInstanceOf(CampaignGiftOfferLockedError)
    // Rascunho que já teve cadastro também trava.
    expect((await redeem.execute(family)).kind).toBe('completed')
    const draft = await admin.update(
      campaign.id,
      { ...semOferta, status: 'draft', expectedUpdatedAt: campaign.updatedAt },
      'Operador',
    )
    expect(draft?.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
    await expect(
      admin.update(
        campaign.id,
        {
          ...input,
          status: 'draft',
          giftOfferId: PARENTS_OFFER.offerId,
          expectedUpdatedAt: draft!.updatedAt,
        },
        'Operador',
      ),
    ).rejects.toBeInstanceOf(CampaignGiftOfferLockedError)
    expect(referrals.redemptions[0]!.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
  })

  test('outra oferta do MESMO curso troca com a campanha no ar e com resgates (27/11/2026)', async () => {
    const { admin, campaign, catalog, referrals, redeem } = await setup()
    expect((await redeem.execute(family)).kind).toBe('completed')
    const seisMeses = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d0a',
      offerSlug: 'cade-todo-mundo-6-meses',
      accessDurationValue: 6,
      accessDurationUnit: 'months',
      advertisedAccessDays: null,
    })
    const trocada = await admin.update(
      campaign.id,
      { ...input, giftOfferId: seisMeses.offerId, expectedUpdatedAt: campaign.updatedAt },
      'Operador',
    )
    expect(trocada?.giftOfferId).toBe(seisMeses.offerId)
    // Quem já resgatou fica com a oferta que recebeu.
    expect(referrals.redemptions[0]!.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
    // Outro curso continua travado.
    await expect(
      admin.update(
        campaign.id,
        { ...input, giftOfferId: PARENTS_OFFER.offerId, expectedUpdatedAt: trocada!.updatedAt },
        'Operador',
      ),
    ).rejects.toBeInstanceOf(CampaignGiftOfferLockedError)
  })

  test('resgate da campanha concede a oferta DELA: vitalícia sem Mural, curso para pais', async () => {
    const { admin, gateway, referrals, redeem } = await setup()
    await admin.create(
      { ...input, code: 'pais-novembro', giftOfferId: PARENTS_OFFER.offerId },
      'Operador',
    )
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Transformando o vilão em aliado', learner: 'parents' },
    }
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    const result = await redeem.execute({ ...family, code: 'pais-novembro' })
    expect(result).toMatchObject({ kind: 'completed', expiresAt: null, muralAccess: 'none' })
    expect(referrals.redemptions[0]).toMatchObject({
      giftOfferId: PARENTS_OFFER.offerId,
      courseSlug: 'vilao-em-aliado',
      accessDurationDays: null,
      muralVisitorPolicy: 'offer',
    })
    expect((gateway.callsOf('grantManualOffer')[0]!.input as GrantManualOfferInput).offerRef).toBe(
      PARENTS_OFFER.offerId,
    )
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-campaign-existing-mural-trial')
    expect(email.variables).toMatchObject({
      campanha: input.publicTitle,
      curso: 'Transformando o vilão em aliado',
      prazo: 'sem prazo para terminar',
      mural: '',
      link: 'https://kids.sistemazero.com.br/pais/cursos/vilao-em-aliado',
    })
  })

  test('prazo divulgado: o acesso grava os 15 dias reais; resposta e e-mail mostram os 7', async () => {
    const { admin, gateway, referrals, redeem, catalog } = await setup()
    const quinze = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '10000000-0000-4000-8000-0000000000aa',
      offerSlug: 'cade-todo-mundo-15-dias',
      accessDurationValue: 15,
      advertisedAccessDays: 7,
    })
    await admin.create({ ...input, code: 'cade-quinze', giftOfferId: quinze.offerId }, 'Operador')
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Cadê Todo Mundo?', learner: 'child' },
    }
    const result = await redeem.execute({ ...family, code: 'cade-quinze' })
    expect(result.kind).toBe('completed')
    const redemption = referrals.redemptions[0]!
    expect(redemption.accessDurationDays).toBe(15)
    const shown = new Date(redemption.createdAt.getTime() + 7 * 86_400_000).toISOString()
    expect(result).toMatchObject({ expiresAt: shown })
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(String(email.variables?.prazo)).toStartWith('por 7 dias, até ')
  })

  test('o prazo divulgado fica no resgate: mudar a oferta depois não muda a data que a pessoa vê', async () => {
    const { admin, gateway, referrals, redeem, catalog } = await setup()
    const quinze = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '10000000-0000-4000-8000-0000000000ab',
      offerSlug: 'cade-quinze-fixo',
      accessDurationValue: 15,
      advertisedAccessDays: 7,
    })
    await admin.create({ ...input, code: 'cade-fixo', giftOfferId: quinze.offerId }, 'Operador')
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Cadê Todo Mundo?', learner: 'child' },
    }
    await redeem.execute({ ...family, code: 'cade-fixo' })
    const redemption = referrals.redemptions[0]!
    expect(redemption.advertisedDays).toBe(7)
    // A equipe tira o divulgado da oferta depois do resgate: quem já resgatou continua vendo 7.
    quinze.advertisedAccessDays = null
    const again = await redeem.execute({ ...family, code: 'cade-fixo' })
    expect(again).toMatchObject({
      kind: 'already_redeemed',
      expiresAt: new Date(redemption.createdAt.getTime() + 7 * 86_400_000).toISOString(),
    })
  })

  test('presentes de cursos diferentes convivem, e outra campanha do mesmo curso não renova o acesso', async () => {
    const { admin, catalog, redeem, referrals, gateway } = await setup()
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Curso', learner: 'child' },
    }
    const first = {
      ...KIDS_GIFT_OFFER,
      offerId: '10000000-0000-4000-8000-000000000001',
      courseSlug: 'curso-um',
    }
    const second = {
      ...first,
      offerId: '10000000-0000-4000-8000-000000000002',
      courseSlug: 'curso-dois',
    }
    catalog.add(first)
    catalog.add(second)
    await admin.create({ ...input, code: 'curso-um-presente', giftOfferId: first.offerId }, 'Admin')
    await admin.create(
      { ...input, code: 'curso-dois-presente', giftOfferId: second.offerId },
      'Admin',
    )
    await admin.create({ ...input, code: 'curso-um-repetido', giftOfferId: first.offerId }, 'Admin')
    const account = { userId: '10000000-0000-4000-8000-000000000099', audience: 'kids' as const }
    const original = await redeem.execute({ ...family, code: 'curso-um-presente' }, account)
    expect(original.kind).toBe('completed')
    expect((await redeem.execute({ ...family, code: 'curso-dois-presente' }, account)).kind).toBe(
      'completed',
    )
    const repeat = await redeem.execute({ ...family, code: 'curso-um-repetido' }, account)
    expect(repeat).toMatchObject({ kind: 'already_redeemed' })
    expect(referrals.redemptions).toHaveLength(2)
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(2)
  })

  test('atribuição descarta campos livres com dados pessoais', () => {
    expect(
      sanitizeGiftAttribution({
        utmSource: 'instagram',
        utmContent: 'pessoa@example.com',
        email: 'pessoa@example.com',
      }),
    ).toEqual({ utmSource: 'instagram', utmMedium: null, utmCampaign: null, utmContent: null })
  })
})

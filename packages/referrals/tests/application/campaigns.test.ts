import { describe, expect, test } from 'bun:test'
import type { CampaignInput } from '@sistemazero/core/referrals'
import { sanitizeGiftAttribution } from '@sistemazero/core/referrals'
import {
  CampaignAdminService,
  validateCampaignInput,
} from '../../src/application/campaigns/campaign-admin.service'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import { CampaignUnavailableError, campaignState } from '../../src/domain/campaign'
import type { GrantManualCourseInput, SendEmailInput } from '../../src/domain/ports/gateway.port'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

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
}
async function setup() {
  const referrals = new InMemoryReferralRepository()
  const campaigns = new InMemoryCampaignRepository(referrals)
  const gateway = new FakeReferralsGateway()
  const admin = new CampaignAdminService(campaigns, referrals, 'https://sistemazero.com.br')
  const campaign = await admin.create(input, 'Operador')
  if (!campaign) throw new Error('seed')
  const redeem = new RedeemScholarshipService(
    referrals,
    gateway,
    {
      campaigns,
      courseSlug: 'cade-todo-mundo',
      kidsCommunityUrl: 'https://kids.sistemazero.com.br',
      leaseMs: 90_000,
    },
    silentLogger,
  )
  return { referrals, campaigns, gateway, admin, campaign, redeem }
}
const family = { code: input.code, email: 'responsavel@example.com', name: 'Responsável' }

describe('campanhas institucionais', () => {
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
    expect(row.attribution?.utmSource).toBe('instagram')
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant.expiresAt).toBe(new Date(row.createdAt.getTime() + 7 * 86_400_000).toISOString())
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).templateKey).toBe(
      'referrals-campaign-welcome',
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
    const newConfiguration = new RedeemScholarshipService(
      referrals,
      gateway,
      {
        campaigns,
        courseSlug: 'curso-futuro',
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
    const grant = gateway.callsOf('grantManualCourse').at(-1)?.input as GrantManualCourseInput
    expect(grant.courseRef).toBe('cade-todo-mundo')
    expect(grant.deliveryId).toBe(`scholarship:course:cade-todo-mundo:${accepted.id}`)
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).variables.campanha).toBe(
      input.publicTitle,
    )
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

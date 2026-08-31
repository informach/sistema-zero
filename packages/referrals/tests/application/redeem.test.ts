import { beforeEach, describe, expect, test } from 'bun:test'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import type { GrantManualOfferInput, SendEmailInput } from '../../src/domain/ports/gateway.port'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const OPTS = {
  offerSlug: 'desafio-primeiro-jogo',
  kidsCommunityUrl: 'https://kids.sistemazero.com.br',
  leaseMs: 90_000,
}

async function seedAmbassadorCode(repo: InMemoryReferralRepository) {
  const created = await repo.createAmbassadorWithCode({
    name: 'Vó Cida',
    email: 'cida@example.com',
    pageToken: 't'.repeat(43),
    code: 'cida-x7k2',
  })
  if (created.kind !== 'created') throw new Error('seed falhou')
  return created
}

describe('RedeemScholarshipService', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let service: RedeemScholarshipService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new RedeemScholarshipService(repo, gateway, OPTS, silentLogger)
    await seedAmbassadorCode(repo)
  })

  const input = { code: 'cida-x7k2', name: 'Paula Prado', email: 'Paula@Example.com ' }

  test('fluxo feliz (conta NOVA): conta → grant → welcome com token', async () => {
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')

    const r = repo.redemptions[0]!
    expect(r.email).toBe('paula@example.com') // normalizado ANTES do UNIQUE
    expect(r.userId).not.toBeNull()
    expect(r.buyerCreated).toBe(true)
    expect(r.grantedAt).not.toBeNull()
    expect(r.status).toBe('completed')
    expect(r.welcomeSentAt).not.toBeNull()

    // Grant com delivery-id/sourceId ESTÁVEIS + oferta completa vitalícia.
    const grant = gateway.callsOf('grantManualOffer')[0]!.input as GrantManualOfferInput
    expect(grant.offerRef).toBe('desafio-primeiro-jogo')
    expect(grant.expiresAt).toBeNull()
    expect(grant.sourceId).toBe(`scholarship:${r.id}`)
    expect(grant.deliveryId).toBe(`scholarship:${r.id}`)

    // Welcome do comprador NOVO: token + template da bolsa com link de senha.
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(1)
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome')
    expect(email.variables.indicador).toBe('Vó Cida')
    expect(email.variables.link).toContain('/redefinir-senha?token=tok-abc')
    expect(send.idempotencyKey).toBe(`scholarship-welcome:${r.id}`)
  })

  test('conta PRÉ-EXISTENTE: sem token, template new-access', async () => {
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(0)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('new-access')
    expect(email.variables.link).toContain('/cursos')
  })

  test('mesmo e-mail de novo → already_redeemed (1 bolsa global)', async () => {
    await service.execute(input)
    const again = await service.execute({ ...input, code: 'cida-x7k2', name: 'Outro Nome' })
    expect(again.kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(1)
  })

  test('código inexistente ou desativado → code_not_found (uniforme)', async () => {
    expect((await service.execute({ ...input, code: 'nao-existe' })).kind).toBe('code_not_found')
    await repo.setAmbassadorCodeStatus(repo.ambassadors[0]!.id, 'disabled')
    expect((await service.execute(input)).kind).toBe('code_not_found')
  })

  test('grant 5xx → upstream_error; RETOMADA não repete o ensure-buyer', async () => {
    gateway.grantResult = { status: 502, body: {} }
    const first = await service.execute(input)
    expect(first.kind).toBe('upstream_error')
    const r = repo.redemptions[0]!
    expect(r.userId).not.toBeNull() // etapa 1 concluída
    expect(r.grantedAt).toBeNull()
    expect(r.status).toBe('pending')

    gateway.grantResult = { status: 200, body: { ok: true } }
    const second = await service.execute(input)
    expect(second.kind).toBe('completed')
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(1) // não repetiu
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(2)
  })

  test('grant 409 → failed grant_conflict (terminal, sem e-mail)', async () => {
    gateway.grantResult = { status: 409, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('failed')
    const r = repo.redemptions[0]!
    expect(r.status).toBe('failed')
    expect(r.failedReason).toBe('grant_conflict')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('falha na emissão do token → claim do welcome LIBERADO (retomável)', async () => {
    gateway.passwordTokenResult = { status: 503, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed') // acesso é o produto; e-mail é best-effort
    const r = repo.redemptions[0]!
    expect(r.welcomeSentAt).toBeNull() // liberado — nada foi emitido
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('falha SÓ no envio pós-token → claim FICA (nunca reemitir o token)', async () => {
    gateway.sendEmailResult = { status: 502, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')
    expect(repo.redemptions[0]!.welcomeSentAt).not.toBeNull()
  })

  test('completed SEM welcome → re-submissão RETOMA só o e-mail (409 + envio)', async () => {
    // Crash entre o grant e o welcome: token falhou → claim liberado, completed.
    gateway.passwordTokenResult = { status: 503, body: {} }
    await service.execute(input)
    expect(repo.redemptions[0]!.welcomeSentAt).toBeNull()

    gateway.passwordTokenResult = {
      status: 201,
      body: { token: 'tok-novo', expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    }
    const again = await service.execute(input)
    expect(again.kind).toBe('already_redeemed') // UX: a bolsa JÁ é dela
    const r = repo.redemptions[0]!
    expect(r.welcomeSentAt).not.toBeNull() // ...mas o welcome saiu agora
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(1) // grant NÃO repetiu
  })

  test('grant com OFFER_UNRESOLVED → lastError gravado (diagnóstico no admin)', async () => {
    gateway.grantResult = { status: 502, body: { ok: false, error: 'OFFER_UNRESOLVED' } }
    const result = await service.execute(input)
    expect(result.kind).toBe('upstream_error')
    const r = repo.redemptions[0]!
    expect(r.status).toBe('pending') // segue retryável
    expect(r.lastError).toBe('grant:502:OFFER_UNRESOLVED')
  })

  test('lease em posse de outra execução → processing (202)', async () => {
    await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    const now = new Date()
    await repo.acquireRedemptionLease(
      repo.redemptions[0]!.id,
      new Date(now.getTime() + 60_000),
      now,
    )
    const result = await service.execute(input)
    expect(result.kind).toBe('processing')
  })

  test('ensure-buyer indisponível → upstream_error e nada persiste de etapa', async () => {
    gateway.ensureBuyerResult = { status: 502, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('upstream_error')
    expect(repo.redemptions[0]!.userId).toBeNull()
  })
})

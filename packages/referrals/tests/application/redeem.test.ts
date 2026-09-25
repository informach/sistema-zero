import { beforeEach, describe, expect, test } from 'bun:test'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import type { GrantManualCourseInput, SendEmailInput } from '../../src/domain/ports/gateway.port'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const OPTS = {
  courseSlug: 'cade-todo-mundo',
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

    // Grant com delivery-id/sourceId ESTÁVEIS + somente o curso indicado.
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant.courseRef).toBe('cade-todo-mundo')
    expect(grant.expiresAt).toBe(
      new Date(r.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
    expect(grant.sourceId).toBe(`scholarship:${r.id}`)
    expect(grant.deliveryId).toBe(`scholarship:course:cade-todo-mundo:${r.id}`)

    // Welcome do comprador NOVO: token + template da bolsa com link de senha.
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(1)
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-7d')
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
    expect(email.templateKey).toBe('referrals-scholarship-existing-7d')
    expect(email.variables.link).toContain('/cursos')
  })

  test('resgate histórico conserva concessão sem vencimento', async () => {
    const { redemption } = await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.accessDurationDays = null

    expect((await service.execute(input)).kind).toBe('completed')
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant.expiresAt).toBeNull()
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome')
  })

  test('conta histórica pré-existente conserva o aviso genérico de acesso', async () => {
    const { redemption } = await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.accessDurationDays = null
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }

    expect((await service.execute(input)).kind).toBe('completed')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('new-access')
  })

  test('retomada do grant não reinicia os sete dias', async () => {
    gateway.grantResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    const redemption = repo.redemptions[0]!
    redemption.createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    gateway.grantResult = { status: 200, body: { ok: true } }

    expect((await service.execute(input)).kind).toBe('completed')
    const grant = gateway.callsOf('grantManualCourse')[1]!.input as GrantManualCourseInput
    expect(grant.expiresAt).toBe(
      new Date(redemption.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
  })

  test('retomada depois do vencimento não concede curso nem envia boas-vindas', async () => {
    gateway.grantResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    repo.redemptions[0]!.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    gateway.grantResult = { status: 200, body: { ok: true } }

    const result = await service.execute(input)
    expect(result).toEqual({ kind: 'failed', reason: 'gift_window_elapsed' })
    expect(repo.redemptions[0]!.failedReason).toBe('gift_window_elapsed')
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(1)
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('grant que responde no instante do vencimento não anuncia acesso utilizável', async () => {
    const { redemption } = await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.createdAt = new Date('2026-01-01T00:00:00.000Z')
    const expiration = new Date(redemption.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    let now = new Date(expiration.getTime() - 1)
    service = new RedeemScholarshipService(repo, gateway, OPTS, silentLogger, () => now)
    const grant = gateway.grantManualCourse.bind(gateway)
    gateway.grantManualCourse = async (request) => {
      const result = await grant(request)
      now = expiration
      return result
    }

    expect(await service.execute(input)).toEqual({ kind: 'failed', reason: 'gift_window_elapsed' })
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
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
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(2)
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
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(1) // grant NÃO repetiu
  })

  test('welcome atrasado não anuncia acesso depois de vencido', async () => {
    gateway.passwordTokenResult = { status: 503, body: {} }
    expect((await service.execute(input)).kind).toBe('completed')
    const redemption = repo.redemptions[0]!
    expect(redemption.welcomeSentAt).toBeNull()
    redemption.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    gateway.passwordTokenResult = { status: 201, body: { token: 'tok-novo' } }

    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('curso despublicado entre consulta e grant → sem e-mail, lastError gravado', async () => {
    gateway.grantResult = { status: 503, body: { ok: false, error: 'COURSE_UNAVAILABLE' } }
    const result = await service.execute(input)
    expect(result.kind).toBe('gift_unavailable')
    const r = repo.redemptions[0]!
    expect(r.status).toBe('pending') // segue retryável
    expect(r.lastError).toBe('grant:503:COURSE_UNAVAILABLE')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('curso não publicado bloqueia antes de criar conta ou claim', async () => {
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(input)).kind).toBe('gift_unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(0)
  })

  test('falha ao consultar disponibilidade também bloqueia sem criar conta', async () => {
    gateway.availabilityResult = { status: 502, body: { error: 'UPSTREAM' } }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('resgate concluído continua reconhecido mesmo se o curso for despublicado depois', async () => {
    expect((await service.execute(input)).kind).toBe('completed')
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(1)
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

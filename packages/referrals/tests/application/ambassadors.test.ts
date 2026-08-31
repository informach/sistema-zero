import { beforeEach, describe, expect, test } from 'bun:test'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import type { SendEmailInput } from '../../src/domain/ports/gateway.port'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const OPTS = { funnelPublicUrl: 'https://sistemazero.com.br' }

describe('AmbassadorAdminService', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let service: AmbassadorAdminService

  beforeEach(() => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new AmbassadorAdminService(repo, gateway, OPTS, silentLogger)
  })

  test('create: embaixador + código + e-mail do magic link', async () => {
    const result = await service.create({ name: 'Vó Cida', email: ' Cida@Example.com ' })
    expect(result.kind).toBe('created')
    if (result.kind !== 'created') return
    expect(result.ambassador.code).toMatch(/^vo-[a-z0-9]{4}$/) // slug do 1º nome
    expect(result.ambassador.pageUrl).toContain('/embaixador/')
    expect(result.ambassador.shareUrl).toContain('/bolsa/vo-')
    expect(result.emailSent).toBe(true)

    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-ambassador-link')
    expect(email.recipient.email).toBe('cida@example.com') // normalizado
    expect(email.variables.link).toBe(result.ambassador.pageUrl!)
    expect(send.idempotencyKey).toMatch(/^ambassador-link:.+:1$/)
  })

  test('e-mail duplicado → email_exists', async () => {
    await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    const again = await service.create({ name: 'Outra Cida', email: 'cida@example.com' })
    expect(again.kind).toBe('email_exists')
  })

  test('colisão de código re-sorteia', async () => {
    repo.failNextCodeInsert = true
    const result = await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    expect(result.kind).toBe('created')
    expect(repo.ambassadors).toHaveLength(1)
  })

  test('falha no messaging não bloqueia a criação (emailSent false, link na resposta)', async () => {
    gateway.sendEmailResult = { status: 502, body: {} }
    const result = await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    expect(result.kind).toBe('created')
    if (result.kind !== 'created') return
    expect(result.emailSent).toBe(false)
    expect(result.ambassador.pageUrl).toBeTruthy() // o admin copia e manda por fora
  })

  test('resendLink: chave versionada, não rotaciona o token', async () => {
    const created = await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    if (created.kind !== 'created') throw new Error('setup')
    const tokenBefore = repo.ambassadors[0]!.pageToken
    const result = await service.resendLink(created.ambassador.id)
    expect(result?.kind).toBe('sent')
    expect(repo.ambassadors[0]!.pageToken).toBe(tokenBefore)
    expect(gateway.callsOf('sendEmail')[1]!.idempotencyKey).toMatch(/:2$/)
  })

  test('patch: desativar desativa o código junto; rotateToken troca o token', async () => {
    const created = await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    if (created.kind !== 'created') throw new Error('setup')
    const tokenBefore = repo.ambassadors[0]!.pageToken

    const updated = await service.patch(created.ambassador.id, {
      status: 'disabled',
      rotateToken: true,
    })
    expect(updated?.status).toBe('disabled')
    expect(repo.codes[0]!.status).toBe('disabled')
    expect(repo.ambassadors[0]!.pageToken).not.toBe(tokenBefore)
  })

  test('detail: resgates do código do embaixador', async () => {
    const created = await service.create({ name: 'Vó Cida', email: 'cida@example.com' })
    if (created.kind !== 'created') throw new Error('setup')
    await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'p@example.com',
      name: 'Paula',
      phone: null,
    })
    const detail = await service.detail(created.ambassador.id)
    expect(detail?.redemptions).toHaveLength(1)
    expect(detail?.redemptions[0]?.email).toBe('p@example.com')
  })
})

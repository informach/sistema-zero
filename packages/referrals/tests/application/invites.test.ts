import { beforeEach, describe, expect, test } from 'bun:test'
import { CreateInviteService } from '../../src/application/invites/create-invite.service'
import type { SendEmailInput } from '../../src/domain/ports/gateway.port'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const TOKEN = 't'.repeat(43)
const OPTS = { funnelPublicUrl: 'https://sistemazero.com.br', dailyLimit: 3 }

describe('CreateInviteService', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let service: CreateInviteService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new CreateInviteService(repo, gateway, OPTS, silentLogger)
    await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: TOKEN,
      code: 'cida-x7k2',
    })
  })

  const input = { pageToken: TOKEN, name: 'Paula Prado', email: 'paula@example.com' }

  test('fluxo feliz: convite enviado com link da bolsa e chave versionada', async () => {
    const result = await service.execute(input)
    expect(result.kind).toBe('sent')
    const invite = repo.invites[0]!
    expect(invite.status).toBe('sent')
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-invite')
    expect(email.variables.indicador).toBe('Vó Cida')
    expect(email.variables.link).toBe('https://sistemazero.com.br/bolsa/cida-x7k2')
    expect(send.idempotencyKey).toBe(`ambassador-invite:${invite.id}:1`)
  })

  test('mesmo e-mail de novo → already_invited (envio único, LGPD)', async () => {
    await service.execute(input)
    const again = await service.execute(input)
    expect(again.kind).toBe('already_invited')
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
  })

  test('convite que FALHOU pode ser reenviado (chave nova)', async () => {
    gateway.sendEmailResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    expect(repo.invites[0]!.status).toBe('failed')

    gateway.sendEmailResult = { status: 202, body: {} }
    expect((await service.execute(input)).kind).toBe('sent')
    expect(gateway.callsOf('sendEmail')[1]!.idempotencyKey).toBe(
      `ambassador-invite:${repo.invites[0]!.id}:2`,
    )
  })

  test('e-mail que já resgatou a bolsa → already_redeemed', async () => {
    await repo.insertRedemption({
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    expect((await service.execute(input)).kind).toBe('already_redeemed')
  })

  test('cap diário → daily_limit', async () => {
    for (let i = 0; i < 3; i++) {
      await service.execute({ ...input, email: `p${i}@example.com` })
    }
    expect((await service.execute({ ...input, email: 'p9@example.com' })).kind).toBe('daily_limit')
  })

  test('token desconhecido ou embaixador desativado → ambassador_not_found', async () => {
    expect((await service.execute({ ...input, pageToken: 'x'.repeat(43) })).kind).toBe(
      'ambassador_not_found',
    )
    await repo.setAmbassadorStatus(repo.ambassadors[0]!.id, 'disabled')
    expect((await service.execute(input)).kind).toBe('ambassador_not_found')
  })
})

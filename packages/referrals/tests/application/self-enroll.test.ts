import { beforeEach, describe, expect, test } from 'bun:test'
import { AmbassadorAdminService } from '../../src/application/ambassadors/ambassador-admin.service'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const OPTS = { funnelPublicUrl: 'https://sistemazero.com.br' }
const ACCOUNT = '11111111-1111-1111-1111-111111111111'

describe('AmbassadorAdminService.selfEnroll (auto-cadastro do pai)', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let service: AmbassadorAdminService

  beforeEach(() => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    service = new AmbassadorAdminService(repo, gateway, OPTS, silentLogger)
  })

  test('1ª vez: cria embaixador VINCULADO à conta e envia o e-mail do link', async () => {
    const result = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'Pai@Example.com',
      name: 'João Pai',
    })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('esperava ok')
    expect(result.created).toBe(true)
    expect(repo.ambassadors[0]!.accountUserId).toBe(ACCOUNT)
    expect(repo.ambassadors[0]!.email).toBe('pai@example.com') // normalizado
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
  })

  test('2ª chamada da MESMA conta é get (não duplica, não reenvia e-mail)', async () => {
    await service.selfEnroll({ accountUserId: ACCOUNT, email: 'pai@example.com', name: 'João' })
    const again = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'pai@example.com',
      name: 'João',
    })
    expect(again.kind).toBe('ok')
    if (again.kind !== 'ok') throw new Error('esperava ok')
    expect(again.created).toBe(false)
    expect(repo.ambassadors).toHaveLength(1)
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
  })

  test('e-mail já é embaixador EXTERNO (cadastro admin) → vincula em vez de duplicar', async () => {
    await service.create({ name: 'João Pai', email: 'pai@example.com' })
    expect(repo.ambassadors[0]!.accountUserId).toBeNull()

    const result = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'pai@example.com',
      name: 'João',
    })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('esperava ok')
    expect(result.created).toBe(false)
    expect(repo.ambassadors).toHaveLength(1)
    expect(repo.ambassadors[0]!.accountUserId).toBe(ACCOUNT)
  })

  test('e-mail preso a OUTRA conta → email_conflict', async () => {
    await service.selfEnroll({
      accountUserId: '22222222-2222-2222-2222-222222222222',
      email: 'pai@example.com',
      name: 'Outro',
    })
    const result = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'pai@example.com',
      name: 'João',
    })
    expect(result.kind).toBe('email_conflict')
  })
})

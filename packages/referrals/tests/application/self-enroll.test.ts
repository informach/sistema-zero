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

  test('⚠️ e-mail já é embaixador EXTERNO: NÃO vincula — manda o link p/ a caixa do dono', async () => {
    // A plataforma não verifica e-mail (`/auth/register` é público e a conta
    // nasce ativa): vincular pelo e-mail entregaria a capability-URL — e a
    // troca da chave Pix — a quem registrasse a conta com o e-mail alheio.
    await service.create({ name: 'João Pai', email: 'pai@example.com' })
    expect(repo.ambassadors[0]!.accountUserId).toBeNull()
    const emailsAfterCreate = gateway.callsOf('sendEmail').length

    const result = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'pai@example.com',
      name: 'João',
    })
    expect(result.kind).toBe('email_pending')
    if (result.kind !== 'email_pending') throw new Error('esperava email_pending')
    expect(result.emailSent).toBe(true)
    // O vínculo NÃO acontece: a conta do requisitante não toca o registro.
    expect(repo.ambassadors).toHaveLength(1)
    expect(repo.ambassadors[0]!.accountUserId).toBeNull()
    // O magic-link foi (re)enviado — para o e-mail do EMBAIXADOR, não para
    // quem pediu (aqui são o mesmo texto; o que importa é o destinatário).
    expect(gateway.callsOf('sendEmail').length).toBe(emailsAfterCreate + 1)
  })

  test('corrida da MESMA conta (dois cliques) é retomada, não "pendente por e-mail"', async () => {
    const [a, b] = await Promise.all([
      service.selfEnroll({ accountUserId: ACCOUNT, email: 'pai@example.com', name: 'João' }),
      service.selfEnroll({ accountUserId: ACCOUNT, email: 'pai@example.com', name: 'João' }),
    ])
    // Uma cria, a outra retoma — nenhuma manda a pessoa esperar um e-mail do
    // cadastro que ela mesma acabou de fazer.
    expect([a.kind, b.kind]).toEqual(['ok', 'ok'])
    const created = [a, b].filter((r) => r.kind === 'ok' && r.created)
    expect(created).toHaveLength(1)
    expect(repo.ambassadors).toHaveLength(1)
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
  })

  test('conta que já tem embaixador tenta com e-mail DIFERENTE → devolve o cadastro dela', async () => {
    // A UNIQUE parcial da conta (`account_exists`) impede o 2º registro; o
    // serviço reconhece a corrida e devolve o que a conta já tem, sem 500.
    await service.selfEnroll({ accountUserId: ACCOUNT, email: 'pai@example.com', name: 'João' })
    const outro = await service.selfEnroll({
      accountUserId: ACCOUNT,
      email: 'pai-novo@example.com',
      name: 'João',
    })
    expect(outro.kind).toBe('ok')
    if (outro.kind !== 'ok') throw new Error('esperava ok')
    expect(outro.created).toBe(false)
    expect(outro.ambassador.email).toBe('pai@example.com')
    expect(repo.ambassadors).toHaveLength(1)
  })

  test('e-mail de OUTRA conta também não vaza acesso: mesma resposta email_pending', async () => {
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
    expect(result.kind).toBe('email_pending')
    // Nada de link/página na resposta e o dono original segue com o registro.
    expect(repo.ambassadors).toHaveLength(1)
    expect(repo.ambassadors[0]!.accountUserId).toBe('22222222-2222-2222-2222-222222222222')
  })
})

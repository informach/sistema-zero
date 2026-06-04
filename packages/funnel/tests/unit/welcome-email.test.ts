import { describe, expect, test } from 'bun:test'
import type { Lead } from '../../src/db/repo'
import { makeSendWelcome } from '../../src/server/welcome-email'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const COMMUNITY_URL = 'http://localhost:3007'

/** Lead pago + registrado (comprador NOVO por padrão) pronto p/ receber o welcome. */
async function registeredLead(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  over: { isNew?: boolean; userId?: string } = {},
): Promise<Lead> {
  const { id } = await repo.createLead()
  await repo.updateLead(id, {
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: '11999998888',
  })
  await repo.setPayment(id, 'pay-1')
  await repo.markPaid(id, new Date())
  await repo.setBuyerRegistration(id, over.userId ?? 'user-1', over.isNew ?? true, new Date())
  const lead = await repo.getLead(id)
  if (!lead) throw new Error('lead não encontrado')
  return lead
}

describe('makeSendWelcome (e-mail de 1º acesso)', () => {
  test('comprador novo → cria token e envia welcome com link de definir senha', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo)

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL })(lead)

    expect(gw.calls.passwordTokens).toEqual(['ana@example.com'])
    expect(gw.calls.messages).toHaveLength(1)
    const sent = gw.calls.messages[0]
    expect(sent?.input.templateKey).toBe('welcome')
    expect(sent?.input.channel).toBe('email')
    expect(sent?.input.recipient).toEqual({ name: 'Ana', email: 'ana@example.com' })
    expect(sent?.input.variables?.link).toBe(`${COMMUNITY_URL}/redefinir-senha?token=fake-pw-token`)
    // Idempotente no replay do webhook (o messaging deduplica por consumer+chave).
    expect(sent?.idempotencyKey).toBe(`welcome-${lead.id}`)
  })

  test('comprador RECORRENTE (is_new=false) → não envia (já tem credenciais)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo, { isNew: false, userId: 'user-existing' })

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL })(lead)

    expect(gw.calls.passwordTokens).toHaveLength(0)
    expect(gw.calls.messages).toHaveLength(0)
  })

  test('falha ao emitir o token → não envia e NÃO lança (best-effort)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setPasswordTokenStatus(404)
    const lead = await registeredLead(repo)

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL })(lead)
    expect(gw.calls.messages).toHaveLength(0)
  })

  test('falha no messaging → NÃO lança (best-effort; fallback = esqueci minha senha)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setSendMessageStatus(502)
    const lead = await registeredLead(repo)

    // Não deve lançar.
    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL })(lead)
    expect(gw.calls.messages).toHaveLength(1)
  })

  test('gateway lançando exceção → NÃO propaga', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo)
    const broken = {
      ...gw.gateway,
      createPasswordToken: async () => {
        throw new Error('rede caiu')
      },
    }
    await makeSendWelcome({ gateway: broken, communityUrl: COMMUNITY_URL })(lead)
    expect(gw.calls.messages).toHaveLength(0)
  })
})

import { describe, expect, test } from 'bun:test'
import { makeSendChargeFailed } from '../../src/server/dunning'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const COMMUNITY_URL = 'http://localhost:3007'
const KIDS_URL = 'http://localhost:3008'

// O link de "ver minha assinatura" tem rota DIFERENTE por app: `/perfis` no kids
// (não existe `/compras` lá) e `/compras` no adulto. O caminho segue o app que
// recebe o clique, não o funil: lead kids sem KIDS_COMMUNITY_URL cai no adulto.
async function paidLead(funnel: string | null, telefone: string | null = null) {
  const { repo } = createFakeRepo()
  const { id } = await repo.createLead(funnel)
  await repo.updateLead(id, { nome: 'Ana Souza', email: 'ana@example.com', telefone })
  const lead = await repo.getLead(id)
  if (!lead) throw new Error('lead não encontrado')
  return lead
}

describe('makeSendChargeFailed (dunning): link da assinatura por app', () => {
  test('lead kids com app kids configurado → /perfis do app kids (e-mail + WhatsApp)', async () => {
    const gw = createFakeGateway()
    const lead = await paidLead('kids/comunidade-dos-criadores', '11999998888')
    await makeSendChargeFailed({
      gateway: gw.gateway,
      communityUrl: COMMUNITY_URL,
      kidsCommunityUrl: KIDS_URL,
    })(lead, 'pay-failed-1')

    expect(gw.calls.messages).toHaveLength(2)
    for (const m of gw.calls.messages) {
      expect(m.input.templateKey).toBe('subscription-charge-failed')
      expect(m.input.variables?.link).toBe(`${KIDS_URL}/perfis`)
    }
    expect(gw.calls.messages.map((m) => m.idempotencyKey)).toEqual([
      'dunning-pay-failed-1',
      'dunning-wa-pay-failed-1',
    ])
  })

  test('lead do funil adulto → /compras do app adulto', async () => {
    const gw = createFakeGateway()
    const lead = await paidLead('pro/no-comando-da-ia')
    await makeSendChargeFailed({
      gateway: gw.gateway,
      communityUrl: COMMUNITY_URL,
      kidsCommunityUrl: KIDS_URL,
    })(lead, 'pay-failed-2')

    expect(gw.calls.messages).toHaveLength(1)
    expect(gw.calls.messages[0]?.input.variables?.link).toBe(`${COMMUNITY_URL}/compras`)
  })

  test('lead kids SEM app kids configurado → cai no app adulto e usa a rota do adulto', async () => {
    const gw = createFakeGateway()
    const lead = await paidLead('kids/comunidade-dos-criadores')
    await makeSendChargeFailed({ gateway: gw.gateway, communityUrl: COMMUNITY_URL })(
      lead,
      'pay-failed-3',
    )

    expect(gw.calls.messages).toHaveLength(1)
    expect(gw.calls.messages[0]?.input.variables?.link).toBe(`${COMMUNITY_URL}/compras`)
  })
})

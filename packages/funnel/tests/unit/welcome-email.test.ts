import { describe, expect, test } from 'bun:test'
import type { Lead } from '../../src/db/repo'
import { makeSendWelcome, toWhatsAppPhone } from '../../src/server/welcome-email'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const COMMUNITY_URL = 'http://localhost:3007'

/** Lead pago + registrado (comprador NOVO por padrão) pronto p/ receber o welcome. */
async function registeredLead(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  over: { isNew?: boolean; userId?: string; telefone?: string | null } = {},
): Promise<Lead> {
  const { id } = await repo.createLead()
  await repo.updateLead(id, {
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: over.telefone === undefined ? '11999998888' : over.telefone,
  })
  await repo.setPayment(id, 'pay-1')
  await repo.markPaid(id, new Date())
  await repo.setBuyerRegistration(id, over.userId ?? 'user-1', over.isNew ?? true, new Date())
  const lead = await repo.getLead(id)
  if (!lead) throw new Error('lead não encontrado')
  return lead
}

describe('makeSendWelcome (boas-vindas de 1º acesso: e-mail + WhatsApp)', () => {
  test('comprador novo → cria token e envia welcome por e-mail E WhatsApp com o mesmo link', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo)

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)

    expect(gw.calls.passwordTokens).toEqual(['ana@example.com'])
    expect(gw.calls.messages).toHaveLength(2)
    const link = `${COMMUNITY_URL}/redefinir-senha?token=fake-pw-token`

    const email = gw.calls.messages[0]
    expect(email?.input.templateKey).toBe('welcome')
    expect(email?.input.channel).toBe('email')
    expect(email?.input.recipient).toEqual({ name: 'Ana', email: 'ana@example.com' })
    expect(email?.input.variables?.link).toBe(link)
    // Idempotente no replay do webhook (o messaging deduplica por consumer+chave).
    expect(email?.idempotencyKey).toBe(`welcome-${lead.id}`)

    const wa = gw.calls.messages[1]
    expect(wa?.input.templateKey).toBe('welcome')
    expect(wa?.input.channel).toBe('whatsapp')
    // Telefone BR (DDD+número) ganha o DDI 55 (formato da Evolution).
    expect(wa?.input.recipient).toEqual({ name: 'Ana', phone: '5511999998888' })
    expect(wa?.input.variables?.link).toBe(link)
    // Chave DISTINTA por canal — a mesma chave deduplicaria contra o e-mail.
    expect(wa?.idempotencyKey).toBe(`welcome-wa-${lead.id}`)
  })

  test('funil kids → link de senha aponta para o app KIDS (kidsCommunityUrl)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const base = await registeredLead(repo)
    // Lead de funil kids (a chave é `audience/produto`).
    const lead = { ...base, funnel: 'kids/desafio-primeiro-jogo' }

    await makeSendWelcome({
      gateway: gw.gateway,
      communityUrl: COMMUNITY_URL,
      kidsCommunityUrl: 'http://localhost:3008',
      repo,
    })(lead)

    const link = 'http://localhost:3008/redefinir-senha?token=fake-pw-token'
    expect(gw.calls.messages[0]?.input.variables?.link).toBe(link)
    expect(gw.calls.messages[1]?.input.variables?.link).toBe(link)
  })

  test('lead sem telefone → só o e-mail sai (WhatsApp é pulado)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo, { telefone: null })

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)

    expect(gw.calls.messages).toHaveLength(1)
    expect(gw.calls.messages[0]?.input.channel).toBe('email')
  })

  test('comprador RECORRENTE (is_new=false) → new-access SEM token, link p/ /cursos (e-mail + WhatsApp)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo, { isNew: false, userId: 'user-existing' })

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)

    // Já tem credenciais → NÃO pede token de senha.
    expect(gw.calls.passwordTokens).toHaveLength(0)
    expect(gw.calls.messages).toHaveLength(2)
    const link = `${COMMUNITY_URL}/cursos`

    const email = gw.calls.messages[0]
    expect(email?.input.templateKey).toBe('new-access')
    expect(email?.input.channel).toBe('email')
    expect(email?.input.recipient).toEqual({ name: 'Ana', email: 'ana@example.com' })
    expect(email?.input.variables?.link).toBe(link)
    expect(email?.idempotencyKey).toBe(`new-access-${lead.id}`)

    const wa = gw.calls.messages[1]
    expect(wa?.input.templateKey).toBe('new-access')
    expect(wa?.input.channel).toBe('whatsapp')
    expect(wa?.input.recipient).toEqual({ name: 'Ana', phone: '5511999998888' })
    expect(wa?.input.variables?.link).toBe(link)
    expect(wa?.idempotencyKey).toBe(`new-access-wa-${lead.id}`)
  })

  test('RECORRENTE em funil kids → new-access aponta p/ o app KIDS /cursos', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const base = await registeredLead(repo, { isNew: false, userId: 'user-existing' })
    const lead = { ...base, funnel: 'kids/desafio-primeiro-jogo' }

    await makeSendWelcome({
      gateway: gw.gateway,
      communityUrl: COMMUNITY_URL,
      kidsCommunityUrl: 'http://localhost:3008',
      repo,
    })(lead)

    expect(gw.calls.passwordTokens).toHaveLength(0)
    expect(gw.calls.messages[0]?.input.variables?.link).toBe('http://localhost:3008/cursos')
  })

  test('RECORRENTE one-shot: 2ª execução não reenvia (claim por lead cobre os dois tipos)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo, { isNew: false, userId: 'user-existing' })
    const send = makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })

    await send(lead)
    expect(gw.calls.messages).toHaveLength(2)
    expect(leads.get(lead.id)?.welcomeSentAt).not.toBeNull()

    const fresh = await repo.getLead(lead.id)
    if (fresh) await send(fresh)
    await send({ ...lead, welcomeSentAt: null }) // snapshot velho → claim atômico barra
    expect(gw.calls.messages).toHaveLength(2)
  })

  test('sem registro no IdP (buyer_is_new nulo) → não envia nada', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com' })
    await repo.setPayment(id, 'pay-x')
    await repo.markPaid(id, new Date())
    const lead = await repo.getLead(id)
    if (!lead) throw new Error('lead')

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)
    expect(gw.calls.messages).toHaveLength(0)
    expect(gw.calls.passwordTokens).toHaveLength(0)
  })

  test('falha ao emitir o token → não envia e NÃO lança (best-effort)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setPasswordTokenStatus(404)
    const lead = await registeredLead(repo)

    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)
    expect(gw.calls.messages).toHaveLength(0)
  })

  test('falha no messaging → NÃO lança e os DOIS canais são tentados (independentes)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setSendMessageStatus(502)
    const lead = await registeredLead(repo)

    // Não deve lançar; a falha do e-mail NÃO impede a tentativa do WhatsApp.
    await makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })(lead)
    expect(gw.calls.messages).toHaveLength(2)
    expect(gw.calls.messages.map((m) => m.input.channel)).toEqual(['email', 'whatsapp'])
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
    await makeSendWelcome({ gateway: broken, communityUrl: COMMUNITY_URL, repo })(lead)
    expect(gw.calls.messages).toHaveLength(0)
  })

  test('ONE-SHOT: 2ª execução (webhook × polling) NÃO re-emite token nem reenvia', async () => {
    // O auth CONSOME os tokens pendentes ao emitir um novo (1 vivo/usuário) e o
    // messaging deduplica o reenvio → sem o claim, a 2ª execução invalidava o
    // token do e-mail JÁ entregue (link morto). Regressão do full review 06/2026.
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo)
    const send = makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })

    await send(lead)
    expect(gw.calls.passwordTokens).toHaveLength(1)
    expect(leads.get(lead.id)?.welcomeSentAt).not.toBeNull()

    // 2ª execução com o lead FRESCO (welcome_sent_at já gravado — guard barato)
    // e com um SNAPSHOT VELHO sem o marcador (corrida: o claim atômico barra).
    const fresh = await repo.getLead(lead.id)
    if (fresh) await send(fresh)
    await send({ ...lead, welcomeSentAt: null })
    expect(gw.calls.passwordTokens).toHaveLength(1)
    expect(gw.calls.messages).toHaveLength(2) // só os 2 canais da 1ª execução
  })

  test('falha na emissão do token LIBERA o claim → retry futuro consegue enviar', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setPasswordTokenStatus(404)
    const lead = await registeredLead(repo)
    const send = makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })

    await send(lead)
    expect(gw.calls.messages).toHaveLength(0)
    // NADA foi emitido → claim liberado p/ o próximo caminho (reentrega/poll).
    expect(leads.get(lead.id)?.welcomeSentAt).toBeNull()

    gw.setPasswordTokenStatus(201)
    const fresh = await repo.getLead(lead.id)
    if (fresh) await send(fresh)
    expect(gw.calls.messages).toHaveLength(2)
    expect(leads.get(lead.id)?.welcomeSentAt).not.toBeNull()
  })

  test('falha no ENVIO não libera o claim (token já emitido — re-emitir mataria o link)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setSendMessageStatus(502)
    const lead = await registeredLead(repo)
    const send = makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo })

    await send(lead)
    expect(gw.calls.passwordTokens).toHaveLength(1)
    expect(leads.get(lead.id)?.welcomeSentAt).not.toBeNull()

    const fresh = await repo.getLead(lead.id)
    if (fresh) await send(fresh)
    expect(gw.calls.passwordTokens).toHaveLength(1) // nenhum token novo
  })

  test('sendMessage lançando exceção no e-mail → WhatsApp ainda é tentado', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const lead = await registeredLead(repo)
    let calls = 0
    const channels: string[] = []
    const flaky = {
      ...gw.gateway,
      sendMessage: async (input: { channel: string }) => {
        calls += 1
        channels.push(input.channel)
        if (input.channel === 'email') throw new Error('rede caiu')
        return { status: 202 as const, body: { messageId: 'msg-1', status: 'QUEUED' } }
      },
    }
    await makeSendWelcome({ gateway: flaky, communityUrl: COMMUNITY_URL, repo })(lead)
    expect(calls).toBe(2)
    expect(channels).toEqual(['email', 'whatsapp'])
  })
})

describe('toWhatsAppPhone (BR → formato internacional da Evolution)', () => {
  test('celular com máscara (11 dígitos) → 55 + dígitos', () => {
    expect(toWhatsAppPhone('(11) 99999-8888')).toBe('5511999998888')
  })

  test('fixo (10 dígitos) → 55 + dígitos', () => {
    expect(toWhatsAppPhone('1133334444')).toBe('551133334444')
  })

  test('já com DDI 55 → mantém', () => {
    expect(toWhatsAppPhone('+55 11 99999-8888')).toBe('5511999998888')
    expect(toWhatsAppPhone('551133334444')).toBe('551133334444')
  })

  test('vazio/curto/estranho → null (não envia)', () => {
    expect(toWhatsAppPhone(null)).toBeNull()
    expect(toWhatsAppPhone('')).toBeNull()
    expect(toWhatsAppPhone('99999')).toBeNull()
    expect(toWhatsAppPhone('123456789012345')).toBeNull() // 15 dígitos, não-BR
  })
})

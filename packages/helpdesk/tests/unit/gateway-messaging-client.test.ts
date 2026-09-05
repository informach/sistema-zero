import { describe, expect, it } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { createGatewayMessagingClient } from '../../src/infrastructure/gateways/messaging/gateway-messaging-client'

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres'

const INPUT = {
  templateKey: 'helpdesk-reply',
  recipient: { name: 'Maria Silva', email: 'maria@example.com' },
  variables: {
    saudacao: 'Olá, Maria!',
    assunto: 'Não consigo abrir a aula',
    link: 'https://kids.test/responsavel/ajuda',
  },
  idempotencyKey: 'helpdesk-reply:msg-1',
}

function capture(status = 202) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response('{}', { status })
  }) as typeof fetch
  return { calls, fetchImpl }
}

/**
 * Contrato de FIO com o gateway/messaging. Os fakes in-memory provam o fluxo;
 * um campo errado aqui (header, corpo, assinatura) falharia 100% em produção
 * sem nenhum teste de aplicação perceber — mesmo motivo do teste do referrals.
 */
describe('cliente messaging via gateway (contrato de fio)', () => {
  it('assina como consumer `helpdesk` e manda exatamente o corpo do POST /messaging/send', async () => {
    const { calls, fetchImpl } = capture()
    const client = createGatewayMessagingClient({
      gatewayUrl: 'http://gateway.test/',
      hmacSecret: SECRET,
      timeoutMs: 1_000,
      fetchImpl,
    })

    await client.sendEmail(INPUT)

    expect(calls).toHaveLength(1)
    const [call] = calls
    expect(call?.url).toBe('http://gateway.test/messaging/send')
    expect(call?.init.method).toBe('POST')
    const headers = call?.init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers['x-consumer-id']).toBe('helpdesk')
    expect(headers['idempotency-key']).toBe('helpdesk-reply:msg-1')
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)

    const rawBody = String(call?.init.body)
    // `variables` (não `data`), sem a chave de idempotência no corpo (vai no header).
    expect(JSON.parse(rawBody)).toEqual({
      channel: 'email',
      templateKey: 'helpdesk-reply',
      recipient: INPUT.recipient,
      variables: INPUT.variables,
    })

    // A assinatura é a que o gateway recomputa: mensagem canônica com o path SEM
    // query, a chave de idempotência e o corpo cru, carimbada com o ts do header.
    const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(headers['x-signature'] ?? '')
    const ts = Number(match?.[1])
    const expected = signHmac(
      SECRET,
      canonicalHmacMessage({
        method: 'POST',
        path: '/messaging/send',
        idempotencyKey: INPUT.idempotencyKey,
        body: rawBody,
      }),
      ts,
    )
    expect(match?.[2]).toBe(expected)
  })

  it('status fora de 2xx lança só com o código HTTP (a resposta pode ecoar PII)', async () => {
    const { fetchImpl } = capture(404)
    const client = createGatewayMessagingClient({
      gatewayUrl: 'http://gateway.test',
      hmacSecret: SECRET,
      timeoutMs: 1_000,
      fetchImpl,
    })
    await expect(client.sendEmail(INPUT)).rejects.toThrow('messaging/send falhou: 404')
  })

  it('timeout aborta a chamada pendurada (e o timer é limpo — o teste termina)', async () => {
    const fetchImpl = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch
    const client = createGatewayMessagingClient({
      gatewayUrl: 'http://gateway.test',
      hmacSecret: SECRET,
      timeoutMs: 20,
      fetchImpl,
    })
    await expect(client.sendEmail(INPUT)).rejects.toThrow('aborted')
  })
})

import { describe, expect, test } from 'bun:test'
import { createGatewayMessagingClient } from '../../src/infrastructure/messaging/gateway-messaging-client'

describe('createGatewayMessagingClient', () => {
  test('envia requisição ao gateway com signal de timeout', async () => {
    let seenSignal: AbortSignal | null | undefined
    const fetchImpl = (async (_input, init) => {
      seenSignal = init?.signal
      return new Response('{}', { status: 202 })
    }) as typeof fetch
    const client = createGatewayMessagingClient({
      gatewayUrl: 'https://gateway.example.com',
      consumerId: 'auth',
      hmacSecret: 'segredo-hmac-de-teste',
      timeoutMs: 1234,
      fetchImpl,
    })

    await client.sendEmail({
      templateKey: 'password-reset',
      recipient: { name: 'Maria', email: 'maria@example.com' },
      variables: { link: 'https://community.example.com/reset', nome: 'Maria' },
      idempotencyKey: 'pwreset-test',
    })

    expect(seenSignal).toBeInstanceOf(AbortSignal)
    expect(seenSignal?.aborted).toBe(false)
  })
})

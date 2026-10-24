import { expect, test } from 'bun:test'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'
import { createRecoveryMessagingGateway } from '../../src/infrastructure/gateways/recovery-messaging.gateway'

const secret = 'qa-recovery-hmac-never-real'
const id = crypto.randomUUID()
const row = {
  id,
  status: 'QUEUED',
  createdAt: '2026-10-24T12:00:00.000Z',
  deliveredAt: null,
  recipient: { email: 'qa@example.test' },
}
const request = {
  idempotencyKey: 'recovery-qa:initial:email',
  channel: 'email' as const,
  templateKey: 'recovery-kids-initial',
  recipient: { name: 'QA', email: 'qa@example.test' },
  variables: { nome: 'QA' },
}

test('retira a intenção original com a mesma chave, corpo assinado e recibo mínimo', async () => {
  const gateway = createRecoveryMessagingGateway({
    gatewayUrl: 'http://gateway.test',
    hmacSecret: secret,
    fetchImpl: async (url, init) => {
      expect(url).toBe('http://gateway.test/messaging/intents/suppress')
      const headers = new Headers(init.headers)
      expect(headers.get('idempotency-key')).toBe(request.idempotencyKey)
      expect(JSON.parse(String(init.body))).toEqual({
        channel: request.channel,
        templateKey: request.templateKey,
        recipient: request.recipient,
        variables: request.variables,
      })
      const signatureHeader = headers.get('x-signature')
      if (!signatureHeader) throw new Error('Missing QA signature')
      expect(
        verifyHmacSignature({
          secret,
          body: canonicalHmacMessage({
            method: 'POST',
            path: '/messaging/intents/suppress',
            idempotencyKey: request.idempotencyKey,
            body: String(init.body),
          }),
          signatureHeader,
          nowSeconds: Math.floor(Date.now() / 1000),
          toleranceSeconds: 300,
        }).valid,
      ).toBe(true)
      return Response.json({ suppressed: true, message: { ...row, status: 'SUPPRESSED' } })
    },
  })
  expect(await gateway.suppressIntent(request)).toEqual({
    suppressed: true,
    receipt: { id, status: 'SUPPRESSED', acceptedAt: new Date(row.createdAt), deliveredAt: null },
  })
})

test('assina a intenção exata e retorna só recibo seguro, sem reenviar automaticamente', async () => {
  let count = 0
  const gateway = createRecoveryMessagingGateway({
    gatewayUrl: 'http://gateway.test',
    hmacSecret: secret,
    fetchImpl: async (url, init) => {
      count++
      expect(url).toBe('http://gateway.test/messaging/send')
      expect(init.redirect).toBe('error')
      const headers = new Headers(init.headers)
      expect(headers.get('x-consumer-id')).toBe('payments')
      const canonical = canonicalHmacMessage({
        method: init.method!,
        path: new URL(url).pathname,
        idempotencyKey: headers.get('idempotency-key')!,
        body: String(init.body),
      })
      expect(
        verifyHmacSignature({
          secret,
          body: canonical,
          signatureHeader: headers.get('x-signature')!,
          nowSeconds: Math.floor(Date.now() / 1000),
          toleranceSeconds: 300,
        }).valid,
      ).toBe(true)
      return Response.json(row, { status: 202 })
    },
  })
  const result = await gateway.send(request)
  expect(result).toEqual({
    id,
    status: 'QUEUED',
    acceptedAt: new Date(row.createdAt),
    deliveredAt: null,
  })
  expect(result).not.toHaveProperty('recipient')
  expect(count).toBe(1)
})
test('erro cru e corpo excessivo não escapam nem causam retry', async () => {
  for (const response of [
    Response.json({ token: 'raw-private-qa' }, { status: 500 }),
    new Response('x'.repeat(65_537)),
  ]) {
    let count = 0
    const gateway = createRecoveryMessagingGateway({
      gatewayUrl: 'http://gateway.test',
      hmacSecret: secret,
      fetchImpl: async () => {
        count++
        return response
      },
    })
    try {
      await gateway.send(request)
      throw new Error('Esperava recusa')
    } catch (error) {
      expect(String(error)).toContain('Não foi possível confirmar')
      expect(String(error)).not.toContain('raw-private-qa')
      expect(error instanceof Error && error.cause).toBeUndefined()
    }
    expect(count).toBe(1)
  }
})
test('consulta recusa recibo de outra identidade e retirada incoerente', async () => {
  const gateway = createRecoveryMessagingGateway({
    gatewayUrl: 'http://gateway.test',
    hmacSecret: secret,
    fetchImpl: async (url) =>
      Response.json(
        url.endsWith('/suppress')
          ? { suppressed: true, message: { ...row, status: 'SENT' } }
          : { ...row, id: crypto.randomUUID() },
      ),
  })
  await expect(gateway.get(id)).rejects.toThrow()
  await expect(gateway.suppress(id)).rejects.toThrow()
})
test('prazo cobre também corpo de resposta que nunca termina', async () => {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{'))
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  })
  try {
    const gateway = createRecoveryMessagingGateway({
      gatewayUrl: server.url.origin,
      hmacSecret: secret,
      timeoutMs: 50,
    })
    let failure: unknown
    try {
      await gateway.send(request)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect(String(failure)).toContain('Não foi possível confirmar')
  } finally {
    await server.stop(true)
  }
})

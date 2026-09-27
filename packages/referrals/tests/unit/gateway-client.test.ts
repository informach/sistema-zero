import { describe, expect, test } from 'bun:test'
import { createReferralsGatewayClient } from '../../src/infrastructure/gateways/gateway.client'

/**
 * Serialização REAL do cliente (fetch capturado) — o achado do full review: o
 * fake dos testes de aplicação valida o FLUXO, mas quem fala com o members é
 * este cliente, e um campo obrigatório ausente no corpo (o `mode: 'course'`)
 * passaria batido por todos os fakes e reprovaria TODA bolsa em produção.
 */
describe('createReferralsGatewayClient — corpo e headers no fio', () => {
  function capture() {
    const seen: { url: string; init: RequestInit }[] = []
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      seen.push({ url: String(url), init: init ?? {} })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as typeof fetch
    const client = createReferralsGatewayClient({
      baseUrl: 'http://gateway.test',
      hmacSecret: 'segredo-de-teste',
      timeoutMs: 5000,
      fetchImpl,
    })
    return { client, seen }
  }

  test('consulta disponibilidade assina GET no caminho exato do curso', async () => {
    const { client, seen } = capture()
    await client.getGiftAvailability('cade-todo-mundo')
    const call = seen[0]!
    expect(call.url).toBe('http://gateway.test/members/webhooks/gift-course/cade-todo-mundo')
    expect(call.init.method).toBe('GET')
    expect(call.init.body).toBeUndefined()
    const headers = call.init.headers as Record<string, string>
    expect(headers['x-consumer-id']).toBe('referrals')
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  test('grantManualCourse envia mode:"course" no corpo (DTO do members exige)', async () => {
    const { client, seen } = capture()
    const res = await client.grantManualCourse({
      userId: 'u-1',
      courseRef: 'cade-todo-mundo',
      sourceId: 'scholarship:r-1',
      expiresAt: null,
      deliveryId: 'scholarship:r-1',
    })
    expect(res.status).toBe(200)
    expect(seen).toHaveLength(1)
    const call = seen[0]!
    expect(call.url).toBe('http://gateway.test/members/webhooks/grant-manual')

    const body = JSON.parse(String(call.init.body)) as Record<string, unknown>
    expect(body.mode).toBe('course')
    expect(body.userId).toBe('u-1')
    expect(body.courseRef).toBe('cade-todo-mundo')
    expect(body.sourceId).toBe('scholarship:r-1')
    expect(body.expiresAt).toBeNull()
    // deliveryId vai no HEADER, nunca no corpo (o canônico HMAC o cobre à parte).
    expect('deliveryId' in body).toBe(false)

    const headers = call.init.headers as Record<string, string>
    expect(headers['x-delivery-id']).toBe('scholarship:r-1')
    expect(headers['x-consumer-id']).toBe('referrals')
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
    expect(headers['idempotency-key']).toBeUndefined()
  })

  test('grantMuralVisitor usa modo próprio e delivery-id independente', async () => {
    const { client, seen } = capture()
    const res = await client.grantMuralVisitor({
      userId: 'u-1',
      sourceId: 'scholarship:r-1',
      deliveryId: 'scholarship:mural-visitor:r-1',
    })
    expect(res.status).toBe(200)
    expect(seen).toHaveLength(1)
    const call = seen[0]!
    expect(call.url).toBe('http://gateway.test/members/webhooks/grant-manual')
    expect(JSON.parse(String(call.init.body))).toEqual({
      mode: 'mural_visitor',
      userId: 'u-1',
      sourceId: 'scholarship:r-1',
    })
    const headers = call.init.headers as Record<string, string>
    expect(headers['x-delivery-id']).toBe('scholarship:mural-visitor:r-1')
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  test('sendEmail leva Idempotency-Key e o envelope de canal', async () => {
    const { client, seen } = capture()
    await client.sendEmail(
      {
        templateKey: 'referrals-scholarship-welcome',
        recipient: { name: 'Ana', email: 'ana@x.com' },
        variables: { nome: 'Ana' },
      },
      'scholarship-welcome:r-1',
    )
    const call = seen[0]!
    expect(call.url).toBe('http://gateway.test/messaging/send')
    const body = JSON.parse(String(call.init.body)) as Record<string, unknown>
    expect(body.channel).toBe('email')
    expect(body.templateKey).toBe('referrals-scholarship-welcome')
    const headers = call.init.headers as Record<string, string>
    expect(headers['idempotency-key']).toBe('scholarship-welcome:r-1')
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  test('timeout/rede não lançam — viram 504/502 por status', async () => {
    const failing = (async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch
    const client = createReferralsGatewayClient({
      baseUrl: 'http://gateway.test',
      hmacSecret: 's',
      timeoutMs: 50,
      fetchImpl: failing,
    })
    const res = await client.ensureBuyer({
      email: 'a@b.c',
      password: 'x',
      firstName: 'A',
      lastName: 'B',
      source: 'scholarship',
    })
    expect(res.status).toBe(502)
  })
})

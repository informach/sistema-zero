import { afterAll, describe, expect, mock, test } from 'bun:test'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

mock.module('server-only', () => ({}))

const { createGatewayModule } = await import('../src/server/gateway')

const realFetch = globalThis.fetch
afterAll(() => {
  globalThis.fetch = realFetch
})

describe('gatewayFetchHmac', () => {
  test('assina método, path e corpo exato como o consumer member-shell', async () => {
    let captured: { url: string; init: RequestInit } | null = null
    globalThis.fetch = (async (input, init) => {
      captured = { url: String(input), init: init ?? {} }
      return Response.json({ ok: true })
    }) as typeof fetch
    const gateway = createGatewayModule({} as never)
    const body = {
      actor: {
        userId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
        accountId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e011',
        privileged: false,
      },
      projectId: 'projeto-1',
      clientMessageId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001',
      question: 'Como faço o pulo?',
    }

    const result = await gateway.gatewayFetchHmac('/members/internal/zappy/questions', {
      method: 'POST',
      body,
    })

    expect(result).toEqual({ status: 200, body: { ok: true } })
    const request = captured as { url: string; init: RequestInit } | null
    expect(request?.url).toBe('http://gateway.test/members/internal/zappy/questions')
    const headers = new Headers(request?.init.headers)
    const rawBody = String(request?.init.body)
    expect(headers.get('x-consumer-id')).toBe('member-shell')
    expect(headers.get('authorization')).toBeNull()
    expect(
      verifyHmacSignature({
        secret: 'member-shell-test-secret-32-characters',
        body: canonicalHmacMessage({
          method: 'POST',
          path: '/members/internal/zappy/questions',
          body: rawBody,
        }),
        signatureHeader: headers.get('x-signature') ?? undefined,
        nowSeconds: Math.floor(Date.now() / 1000),
        toleranceSeconds: 5,
      }).valid,
    ).toBe(true)
  })
})

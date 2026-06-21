import { afterAll, describe, expect, mock, test } from 'bun:test'

// `server-only` lanca fora do React Server; neutraliza para testar os clients.
mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { createGatewayModule } = await import('../src/server/gateway')
const { createAuthClient } = await import('../src/server/clients')

const realFetch = globalThis.fetch
afterAll(() => {
  globalThis.fetch = realFetch
})

function failFetch() {
  globalThis.fetch = (async () => {
    throw new Error('gateway indisponivel')
  }) as unknown as typeof fetch
}

describe('auth publico quando o gateway esta indisponivel', () => {
  test('login por senha responde 503 em vez de estourar 500 local', async () => {
    failFetch()
    const gateway = createGatewayModule({} as never)

    const res = await gateway.loginRequest('aluno@example.com', 'senha')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } })
  })

  test('reset publico responde 503 em vez de estourar 500 local', async () => {
    failFetch()
    const auth = createAuthClient({} as never)

    const res = await auth.resetPasswordWithOtp('aluno@example.com', '123456', 'nova-senha-123')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } })
  })
})

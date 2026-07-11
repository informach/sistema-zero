import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

// Env mínima ANTES do import (getEnv valida no primeiro uso).
process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { createShellRoutes } = await import('../src/routes/index')

/** Rotas com um gateway fake que devolve a resposta dada no verify do OTP. */
function makeRoutes(verify: { status: number; body: unknown }) {
  const deps = {
    session: { setSessionCookies: async () => {} },
    gateway: { verifyOtpRequest: async () => verify },
  } as never
  return createShellRoutes(deps)
}

function postVerify(body: unknown): Request {
  return new Request('http://shell.test/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('authOtpVerify: gate de conta sem senha definida', () => {
  test('403 do auth com PASSWORD_NOT_SET é repassado (a UI orienta criar a senha)', async () => {
    const routes = makeRoutes({ status: 403, body: { error: { code: 'PASSWORD_NOT_SET' } } })

    const res = await routes.authOtpVerify.POST(
      postVerify({ email: 'pai@example.com', code: '123456' }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: { code: 'PASSWORD_NOT_SET' } })
  })

  test('403 com outro code (ou sem code) segue colapsado em INACTIVE', async () => {
    const routes = makeRoutes({ status: 403, body: { error: { code: 'ACCOUNT_INACTIVE' } } })

    const res = await routes.authOtpVerify.POST(
      postVerify({ email: 'pai@example.com', code: '123456' }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: { code: 'INACTIVE' } })
  })

  test('403 com body vazio também vira INACTIVE (sem estourar no narrow)', async () => {
    const routes = makeRoutes({ status: 403, body: null })

    const res = await routes.authOtpVerify.POST(
      postVerify({ email: 'pai@example.com', code: '123456' }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: { code: 'INACTIVE' } })
  })
})

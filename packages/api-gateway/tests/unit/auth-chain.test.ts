import { describe, expect, test } from 'bun:test'
import { createAuthChain } from '../../src/application/auth/auth-chain'
import type { AuthResult, AuthStrategy } from '../../src/application/auth/auth-strategy.port'
import { createSessionStrategy } from '../../src/application/auth/session.strategy'
import type { GatewayStore } from '../../src/domain/ports/gateway-store.port'
import type { AuthStrategyKind } from '../../src/domain/routing/route'
import { authPolicySchema } from '../../src/infrastructure/config/gateway-config.schema'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'
import { makeContext } from '../helpers'

const strat = (name: AuthStrategyKind, result: AuthResult): AuthStrategy => ({
  name,
  authenticate: async () => result,
})

const okJwt = strat('jwt', { ok: true, principal: { kind: 'jwt', subject: 'user-1' } })
const skipHmac = strat('hmac', { ok: 'skip' })
const failJwt = strat('jwt', { ok: false, status: 401, code: 'INVALID_TOKEN', message: 'x' })
const okHmac = strat('hmac', { ok: true, principal: { kind: 'hmac', subject: 'sys-a' } })

const policy = (o: { mode?: 'any' | 'all'; required?: boolean; strategies: AuthStrategyKind[] }) =>
  authPolicySchema.parse(o)

describe('auth chain', () => {
  test('any: hmac skip + jwt ok → autentica via jwt', async () => {
    const chain = createAuthChain({ hmac: skipHmac, jwt: okJwt })
    const r = await chain.authenticate(
      makeContext(),
      policy({ mode: 'any', strategies: ['hmac', 'jwt'] }),
    )
    expect(r.ok).toBe(true)
    if (r.ok === true) expect(r.principal.subject).toBe('user-1')
  })

  test('any: todas skip + required → 401', async () => {
    const chain = createAuthChain({ hmac: skipHmac })
    const r = await chain.authenticate(
      makeContext(),
      policy({ mode: 'any', required: true, strategies: ['hmac'] }),
    )
    expect(r).toMatchObject({ ok: false, status: 401 })
  })

  test('any: todas skip + opcional → skip', async () => {
    const chain = createAuthChain({ hmac: skipHmac })
    const r = await chain.authenticate(
      makeContext(),
      policy({ mode: 'any', required: false, strategies: ['hmac'] }),
    )
    expect(r.ok).toBe('skip')
  })

  test('all: ok+ok → autentica; ok+fail → falha', async () => {
    const okBoth = createAuthChain({ hmac: okHmac, jwt: okJwt })
    expect(
      (
        await okBoth.authenticate(
          makeContext(),
          policy({ mode: 'all', strategies: ['hmac', 'jwt'] }),
        )
      ).ok,
    ).toBe(true)

    const oneFails = createAuthChain({ hmac: okHmac, jwt: failJwt })
    expect(
      await oneFails.authenticate(
        makeContext(),
        policy({ mode: 'all', strategies: ['hmac', 'jwt'] }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_TOKEN' })
  })

  test('public → skip', async () => {
    const chain = createAuthChain({})
    expect((await chain.authenticate(makeContext(), 'public')).ok).toBe('skip')
  })
})

describe('session strategy: store indisponível', () => {
  test('erro do store → 401 AUTH_UNAVAILABLE (fail-CLOSED, sem 500)', async () => {
    const broken: GatewayStore = {
      ...createInMemoryStore(),
      get: async () => {
        throw new Error('store down')
      },
    }
    const strategy = createSessionStrategy(broken)
    const ctx = makeContext({ headers: { 'x-session-token': 'tok-1' } })
    // Auth NUNCA falha aberto; e o throw não pode subir (viraria 500 no pipeline).
    const r = await strategy.authenticate(ctx)
    expect(r).toMatchObject({ ok: false, status: 401, code: 'AUTH_UNAVAILABLE' })
  })
})

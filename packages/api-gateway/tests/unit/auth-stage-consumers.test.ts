import { describe, expect, test } from 'bun:test'
import type { AuthChain } from '../../src/application/auth/auth-chain'
import type { Principal } from '../../src/application/auth/auth-strategy.port'
import { createAuthStage } from '../../src/application/pipeline/stages/auth.stage'
import type { RouteMatch } from '../../src/domain/routing/route-match'
import { authPolicySchema } from '../../src/infrastructure/config/gateway-config.schema'
import { makeContext } from '../helpers'

/** Cadeia fake que sempre autentica com o principal dado (a allowlist é do STAGE). */
function chainReturning(principal: Principal): AuthChain {
  return { authenticate: async () => ({ ok: true as const, principal }) } as AuthChain
}

function routeWithAuth(auth: unknown): RouteMatch {
  return {
    route: { id: 'r-1', auth } as RouteMatch['route'],
    params: {},
    version: 'v1',
  }
}

const policy = (allowedConsumers?: string[]) =>
  authPolicySchema.parse({ required: true, mode: 'any', strategies: ['hmac'], allowedConsumers })

describe('auth stage — allowedConsumers (allowlist de consumers HMAC)', () => {
  test('consumer FORA da lista → 403 CONSUMER_NOT_ALLOWED mesmo com assinatura válida', async () => {
    const stage = createAuthStage(chainReturning({ kind: 'hmac', subject: 'auth' }))
    const ctx = makeContext()
    ctx.route = routeWithAuth(policy(['referrals']))
    const res = await stage.run(ctx)
    expect(res).toBeInstanceOf(Response)
    expect((res as Response).status).toBe(403)
    const body = (await (res as Response).json()) as { error: { code: string } }
    expect(body.error.code).toBe('CONSUMER_NOT_ALLOWED')
    expect(ctx.principal).toBeUndefined()
  })

  test('consumer NA lista → passa e anexa o principal', async () => {
    const stage = createAuthStage(chainReturning({ kind: 'hmac', subject: 'referrals' }))
    const ctx = makeContext()
    ctx.route = routeWithAuth(policy(['referrals']))
    expect(await stage.run(ctx)).toBeUndefined()
    expect(ctx.principal?.subject).toBe('referrals')
  })

  test('sem allowedConsumers → qualquer consumer autenticado passa (compat)', async () => {
    const stage = createAuthStage(chainReturning({ kind: 'hmac', subject: 'auth' }))
    const ctx = makeContext()
    ctx.route = routeWithAuth(policy(undefined))
    expect(await stage.run(ctx)).toBeUndefined()
    expect(ctx.principal?.subject).toBe('auth')
  })

  test('principal NÃO-hmac (jwt) ignora a allowlist — ela só governa consumers', async () => {
    const stage = createAuthStage(chainReturning({ kind: 'jwt', subject: 'user-1' }))
    const ctx = makeContext()
    ctx.route = routeWithAuth(policy(['referrals']))
    expect(await stage.run(ctx)).toBeUndefined()
    expect(ctx.principal?.subject).toBe('user-1')
  })
})

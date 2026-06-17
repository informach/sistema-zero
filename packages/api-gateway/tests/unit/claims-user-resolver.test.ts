import { describe, expect, test } from 'bun:test'
import type { Principal } from '../../src/application/auth/auth-strategy.port'
import { createClaimsUserResolver } from '../../src/application/auth/claims-user-resolver'

const resolver = createClaimsUserResolver()
const baseClaims = {
  email: 'pai@example.com',
  firstName: 'Pai',
  lastName: 'Silva',
  role: 'customer',
  status: 'active',
}
const jwt = (subject: string, claims: Record<string, unknown>): Principal => ({
  kind: 'jwt',
  subject,
  claims,
})

describe('createClaimsUserResolver — sessão de perfil (claim pfl)', () => {
  test('pfl.accountId → user.accountId; o sub continua sendo o PERFIL', async () => {
    const user = await resolver.resolve(
      jwt('profile-1', { ...baseClaims, pfl: { accountId: 'conta-1', name: 'Sofia' } }),
    )
    expect(user?.id).toBe('profile-1')
    expect(user?.accountId).toBe('conta-1')
  })

  test('sessão normal da conta (sem pfl) → accountId ausente', async () => {
    const user = await resolver.resolve(jwt('conta-1', baseClaims))
    expect(user?.id).toBe('conta-1')
    expect(user?.accountId).toBeUndefined()
  })

  test('pfl malformado (sem accountId) → ignorado', async () => {
    const user = await resolver.resolve(jwt('profile-1', { ...baseClaims, pfl: { name: 'x' } }))
    expect(user?.accountId).toBeUndefined()
  })
})

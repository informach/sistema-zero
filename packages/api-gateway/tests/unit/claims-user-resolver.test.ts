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
  test('pfl.accountId/name → user.accountId/profileName; o sub continua sendo o PERFIL', async () => {
    const user = await resolver.resolve(
      jwt('profile-1', { ...baseClaims, pfl: { accountId: 'conta-1', name: 'Sofia' } }),
    )
    expect(user?.id).toBe('profile-1')
    expect(user?.accountId).toBe('conta-1')
    expect(user?.profileName).toBe('Sofia')
  })

  test('sessão normal da conta (sem pfl) → accountId/profileName ausentes', async () => {
    const user = await resolver.resolve(jwt('conta-1', baseClaims))
    expect(user?.id).toBe('conta-1')
    expect(user?.accountId).toBeUndefined()
    expect(user?.profileName).toBeUndefined()
  })

  test('pfl malformado (sem accountId) → ignorado', async () => {
    const user = await resolver.resolve(jwt('profile-1', { ...baseClaims, pfl: { name: 'x' } }))
    expect(user?.accountId).toBeUndefined()
  })
})

describe('createClaimsUserResolver — sessão de impersonação (claim act)', () => {
  test('act.sub → user.impersonatorId; o sub continua sendo o ALVO', async () => {
    const user = await resolver.resolve(
      jwt('aluno-1', { ...baseClaims, act: { sub: 'admin-9', email: 'a@x.com', name: 'Admin' } }),
    )
    expect(user?.id).toBe('aluno-1')
    expect(user?.impersonatorId).toBe('admin-9')
  })

  test('sessão normal (sem act) → impersonatorId ausente', async () => {
    const user = await resolver.resolve(jwt('conta-1', baseClaims))
    expect(user?.impersonatorId).toBeUndefined()
  })

  test('act malformado (sem sub) → ignorado', async () => {
    const user = await resolver.resolve(jwt('aluno-1', { ...baseClaims, act: { name: 'x' } }))
    expect(user?.impersonatorId).toBeUndefined()
  })
})

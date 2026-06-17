import { describe, expect, test } from 'bun:test'
import { GetProfileAllowanceService } from '../../src/application/profile-allowance/get-profile-allowance.service'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import type { FulfillmentSpec } from '../../src/domain/entitlement/fulfillment'
import { InMemoryEntitlementRepository } from '../fakes/in-memory'

const T = (s: string) => new Date(s)
const NOW = T('2026-06-15')

let seq = 0
function grant(opts: {
  userId: string
  maxProfiles?: number
  expiresAt?: Date | null
}): EntitlementAggregate {
  seq += 1
  const fulfillment: FulfillmentSpec | null =
    opts.maxProfiles === undefined
      ? null
      : { accessType: 'course', courseRef: 'kids-curso', maxProfiles: opts.maxProfiles }
  return EntitlementAggregate.grant({
    id: `e${seq}`,
    userId: opts.userId,
    productId: `p${seq}`,
    productKind: 'course',
    accessType: 'course',
    courseRef: 'kids-curso',
    offerId: `o${seq}`,
    snapshot: {
      offerId: `o${seq}`,
      offerSlug: 'o',
      productId: `p${seq}`,
      sku: 's',
      name: 'n',
      kind: 'course',
      accessType: 'course',
      courseRef: 'kids-curso',
      fulfillment,
      resolvedAt: NOW.toISOString(),
    },
    sourceKind: 'payment',
    sourceId: `pay${seq}`,
    grantedAt: T('2026-01-01'),
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `k${seq}`,
  })
}

function service(repo: InMemoryEntitlementRepository, defaultMaxProfiles = 1) {
  return new GetProfileAllowanceService(repo, () => NOW, { defaultMaxProfiles })
}

describe('GetProfileAllowanceService', () => {
  test('conta sem matrícula ativa → 0 (não comprou, não cria perfil)', async () => {
    const repo = new InMemoryEntitlementRepository()
    expect(await service(repo).execute('conta-sem-compra')).toEqual({ maxProfiles: 0 })
  })

  test('matrícula define maxProfiles → usa o valor', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 2 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 2 })
  })

  test('upgrade de plano (2 e 4 ativos) → o MAIOR', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 2 }))
    repo.seed(grant({ userId: 'pai', maxProfiles: 4 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 4 })
  })

  test('matrícula ativa SEM o campo (legado) → default', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai' }))
    expect(await service(repo, 3).execute('pai')).toEqual({ maxProfiles: 3 })
  })

  test('matrícula EXPIRADA não conta', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 4, expiresAt: T('2026-01-10') }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 0 })
  })

  test('só a matrícula de outra conta tem o campo → não vaza', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'outro-pai', maxProfiles: 4 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 0 })
  })
})

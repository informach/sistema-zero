import { describe, expect, test } from 'bun:test'
import { MoldaEntitlementRolloutService } from '../../src/application/molda-rollout/molda-entitlement-rollout.service'
import type { MoldaRolloutCandidateSource } from '../../src/domain/ports/molda-rollout-candidates.port'
import { FakeCatalogGateway, InMemoryEntitlementRepository } from '../fakes/in-memory'

const NOW = new Date('2026-09-05T12:00:00.000Z')
const candidate = {
  userId: '00000000-0000-4000-8000-000000000001',
  subscriptionId: 'sub-community-1',
  offerSlug: 'comunidade-dos-criadores-mensal',
  grantedAt: new Date('2026-08-20T12:00:00.000Z'),
  expiresAt: new Date('2026-09-20T12:00:00.000Z'),
}

function setup() {
  const entitlements = new InMemoryEntitlementRepository()
  const catalog = new FakeCatalogGateway()
  catalog.offers.set(candidate.offerSlug, {
    offerId: '00000000-0000-4000-8000-000000000010',
    offerSlug: candidate.offerSlug,
    items: [
      {
        productId: '00000000-0000-4000-8000-000000000020',
        sku: 'molda',
        name: 'Molda',
        kind: 'tool',
        isPrimary: false,
        fulfillment: { accessType: 'community', courseRef: 'molda' },
      },
    ],
  })
  const candidates: MoldaRolloutCandidateSource = { listActive: async () => [candidate] }
  let id = 0
  return {
    entitlements,
    service: new MoldaEntitlementRolloutService({
      candidates,
      catalog,
      entitlements,
      newId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
      clock: () => NOW,
    }),
  }
}

describe('MoldaEntitlementRolloutService', () => {
  test('é dry-run por padrão e não persiste', async () => {
    const { service, entitlements } = setup()

    expect(await service.execute()).toEqual({
      scanned: 1,
      eligible: 1,
      granted: 0,
      alreadyPresent: 0,
      failed: 0,
    })
    expect(entitlements.byId.size).toBe(0)
  })

  test('concede uma vez e a reexecução é idempotente', async () => {
    const { service, entitlements } = setup()

    expect((await service.execute({ apply: true })).granted).toBe(1)
    expect(await service.execute({ apply: true })).toMatchObject({
      granted: 0,
      alreadyPresent: 1,
    })
    expect(entitlements.byId.size).toBe(1)
    expect([...entitlements.byId.values()][0]).toMatchObject({
      courseRef: 'molda',
      subscriptionId: candidate.subscriptionId,
      expiresAt: candidate.expiresAt,
    })
  })
})

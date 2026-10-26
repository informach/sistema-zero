import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  EntitlementAggregate,
  type GrantEntitlementInput,
} from '../../src/domain/entitlement/entitlement.aggregate'
import { independentCourseAccessReason } from '../../src/domain/entitlement/independent-course-access'

const now = new Date('2026-10-25T12:00:00Z')
function grant(patch: Partial<GrantEntitlementInput> = {}) {
  return EntitlementAggregate.grant({
    id: randomUUID(),
    userId: randomUUID(),
    productId: randomUUID(),
    productKind: 'course',
    accessType: 'course',
    courseRef: 'cade-todo-mundo',
    offerId: null,
    sourceKind: 'payment',
    sourceId: randomUUID(),
    grantedAt: now,
    expiresAt: new Date('2026-11-01T12:00:00Z'),
    idempotencyKey: randomUUID(),
    snapshot: {
      offerId: 'o',
      offerSlug: 'o',
      productId: 'p',
      sku: 'c',
      name: 'Cadê',
      kind: 'course',
      accessType: 'course',
      courseRef: 'cade-todo-mundo',
      fulfillment: null,
      resolvedAt: now.toISOString(),
    },
    ...patch,
  })
}
test('active independent purchase survives a stronger subscription and expires at its own time', () => {
  const purchase = grant()
  const subscription = grant({
    accessType: 'all_kids_courses',
    sourceKind: 'subscription',
    subscriptionId: randomUUID(),
    expiresAt: null,
  })
  expect(independentCourseAccessReason('cade-todo-mundo', [subscription, purchase], now)).toBe(
    'direct-purchase',
  )
  expect(
    independentCourseAccessReason(
      'cade-todo-mundo',
      [subscription, purchase],
      new Date('2026-11-01T12:00:00Z'),
    ),
  ).toBeUndefined()
})
test('course-specific subscription is not an independent purchase', () => {
  expect(
    independentCourseAccessReason('cade-todo-mundo', [grant({ sourceKind: 'subscription' })], now),
  ).toBeUndefined()
  expect(
    independentCourseAccessReason(
      'cade-todo-mundo',
      [grant({ subscriptionId: randomUUID() })],
      now,
    ),
  ).toBeUndefined()
})
test('explicit gift and manual rights keep their promises, revocation closes them', () => {
  const gift = grant({ sourceKind: 'manual', sourceId: `scholarship:${randomUUID()}` })
  expect(independentCourseAccessReason('cade-todo-mundo', [gift], now)).toBe('gift')
  gift.revoke(now)
  expect(independentCourseAccessReason('cade-todo-mundo', [gift], now)).toBeUndefined()
  expect(
    independentCourseAccessReason(
      'cade-todo-mundo',
      [grant({ sourceKind: 'manual', sourceId: 'manual' })],
      now,
    ),
  ).toBe('manual-grant')
})
test('only the actual specified Farol or Cadê product bypasses the curriculum', () => {
  expect(independentCourseAccessReason('desafio-primeiro-jogo', [grant()], now)).toBeUndefined()
  expect(
    independentCourseAccessReason('corre-dino', [grant({ courseRef: 'corre-dino' })], now),
  ).toBeUndefined()
  expect(
    independentCourseAccessReason(
      'desafio-primeiro-jogo-adulto',
      [grant({ courseRef: 'desafio-primeiro-jogo-adulto' })],
      now,
    ),
  ).toBe('direct-purchase')
})

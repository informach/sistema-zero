import { describe, expect, test } from 'bun:test'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'

const T = (s: string) => new Date(s)

function make(expiresAt: Date | null = null): EntitlementAggregate {
  return EntitlementAggregate.grant({
    id: 'e1',
    userId: 'u1',
    productId: 'p1',
    productKind: 'course',
    accessType: 'course',
    courseRef: 'c1',
    offerId: 'o1',
    snapshot: {
      offerId: 'o1',
      offerSlug: 'o',
      productId: 'p1',
      sku: 's',
      name: 'n',
      kind: 'course',
      accessType: 'course',
      courseRef: 'c1',
      fulfillment: null,
      resolvedAt: T('2026-01-01').toISOString(),
    },
    sourceKind: 'subscription',
    sourceId: 'sub1',
    subscriptionId: 'sub1',
    grantedAt: T('2026-01-01'),
    expiresAt,
    idempotencyKey: 'k1',
  })
}

describe('EntitlementAggregate', () => {
  test('vitalícia (expiresAt null) está sempre ativa', () => {
    expect(make(null).isActiveAt(T('2030-01-01'))).toBe(true)
  })

  test('validade futura → ativa; passada → inativa', () => {
    const e = make(T('2026-02-01'))
    expect(e.isActiveAt(T('2026-01-15'))).toBe(true)
    expect(e.isActiveAt(T('2026-03-01'))).toBe(false)
  })

  test('extendTo só move a validade para frente', () => {
    const e = make(T('2026-02-01'))
    e.extendTo(T('2026-01-15'), T('2026-01-10')) // menor → ignora
    expect(e.expiresAt?.toISOString()).toBe(T('2026-02-01').toISOString())
    e.extendTo(T('2026-03-01'), T('2026-01-10'))
    expect(e.expiresAt?.toISOString()).toBe(T('2026-03-01').toISOString())
  })

  test('extendTo reativa uma matrícula expirada se a nova validade é futura', () => {
    const e = make(T('2026-02-01'))
    e.expire(T('2026-02-02'))
    expect(e.status).toBe('expired')
    e.extendTo(T('2026-04-01'), T('2026-02-02'))
    expect(e.status).toBe('active')
  })

  test('revoke encerra o acesso e não é reativável por extendTo', () => {
    const e = make(null)
    e.revoke(T('2026-02-01'))
    expect(e.status).toBe('revoked')
    e.extendTo(T('2030-01-01'), T('2026-02-01'))
    expect(e.status).toBe('revoked')
    expect(e.isActiveAt(T('2026-02-02'))).toBe(false)
  })
})

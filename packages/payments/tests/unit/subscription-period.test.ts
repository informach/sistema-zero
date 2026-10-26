import { expect, test } from 'bun:test'
import { subscriptionCycleAccess } from '../../src/application/subscription-recovery/subscription-period'

const input = {
  providerSubscription: {
    providerSubscriptionId: 'qa-sub',
    status: 'ACTIVE' as const,
    charges: [
      {
        chargeId: 'qa-charge',
        status: 'PAID' as const,
        createdAt: new Date('2026-09-16T12:00:00Z'),
      },
    ],
  },
  providerSubscriptionId: 'qa-sub',
  providerPaymentId: 'qa-charge',
  intervalMonths: 1,
  observedAt: new Date('2026-10-24T12:00:00Z'),
}
test('pagamento tardio mantém o mês coberto pela cobrança original', () => {
  expect(subscriptionCycleAccess(input)).toEqual({
    version: 1,
    kind: 'VERIFIED_PERIOD',
    period: { startsAt: '2026-09-16T12:00:00.000Z', endsAt: '2026-10-16T12:00:00.000Z' },
  })
})
test('data ausente, futura ou vínculo divergente fica em revisão sem inventar período', () => {
  expect(
    subscriptionCycleAccess({
      ...input,
      providerSubscription: {
        ...input.providerSubscription,
        charges: [{ chargeId: 'qa-charge', status: 'PAID' }],
      },
    }).kind,
  ).toBe('REVIEW_REQUIRED')
  expect(
    subscriptionCycleAccess({ ...input, observedAt: new Date('2026-09-01T00:00:00Z') }).kind,
  ).toBe('REVIEW_REQUIRED')
  expect(subscriptionCycleAccess({ ...input, providerSubscriptionId: 'qa-other' }).kind).toBe(
    'REVIEW_REQUIRED',
  )
})

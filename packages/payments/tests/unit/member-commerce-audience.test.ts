import { expect, test } from 'bun:test'
import { verifiedBillingAudience } from '../../src/domain/subscription-recovery/billing-audience'

test('recuperação reconhece público do checkout autenticado com conta e oferta resolvidas', () => {
  const metadata = {
    billingAudienceSource: 'member-commerce-v1',
    accountUserId: '10000000-0000-4000-8000-000000000001',
    offerId: '20000000-0000-4000-8000-000000000001',
    billingAudience: 'kids',
  }
  expect(verifiedBillingAudience(metadata)).toBe('kids')
  expect(verifiedBillingAudience({ ...metadata, billingAudience: 'adult' })).toBe('adult')
  expect(verifiedBillingAudience({ ...metadata, accountUserId: '' })).toBeNull()
  expect(verifiedBillingAudience({ ...metadata, offerId: '' })).toBeNull()
  expect(verifiedBillingAudience({ ...metadata, billingAudienceSource: 'browser' })).toBeNull()
})

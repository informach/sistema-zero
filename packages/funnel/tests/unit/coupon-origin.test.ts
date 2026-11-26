import { expect, test } from 'bun:test'
import { resolveCouponCampaignOrigin } from '../../src/server/coupon-link'
import { createFakeGateway } from '../fakes/fake-gateway'

test('link antigo de cupom conserva a campanha na origem da aquisição', async () => {
  const fake = createFakeGateway()
  fake.setLinkResult(200, { code: 'laopa-20261113', sourceKind: 'campaign', audience: 'kids' })
  expect(await resolveCouponCampaignOrigin(fake.gateway, 'laopa-20261113', 'kids')).toBe(
    'laopa-20261113',
  )
  expect(await resolveCouponCampaignOrigin(fake.gateway, 'laopa-20261113', 'adult')).toBeNull()
  expect(await resolveCouponCampaignOrigin(fake.gateway, 'not-a-code', 'kids')).toBeNull()
  fake.setLinkResult(200, { code: 'laopa-20261113', sourceKind: 'ambassador', audience: 'kids' })
  expect(await resolveCouponCampaignOrigin(fake.gateway, 'laopa-20261113', 'kids')).toBeNull()
  fake.setLinkResult(503, null)
  expect(await resolveCouponCampaignOrigin(fake.gateway, 'laopa-20261113', 'kids')).toBeNull()
})

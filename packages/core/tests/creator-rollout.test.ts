import { expect, test } from 'bun:test'
import { creatorWorkshopEnabled } from '../src/career/rollout'

test('workshop rollout is explicit, exact and reversible for the whole account', () => {
  expect(creatorWorkshopEnabled('family', undefined)).toBe(false)
  expect(creatorWorkshopEnabled('family', 'none')).toBe(false)
  expect(creatorWorkshopEnabled(null, 'all')).toBe(false)
  expect(creatorWorkshopEnabled('family', 'other, family ')).toBe(true)
  expect(creatorWorkshopEnabled('family-2', 'family')).toBe(false)
  expect(creatorWorkshopEnabled('family', 'all')).toBe(true)
})

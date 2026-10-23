import { describe, expect, test } from 'bun:test'
import { kidsJourneyTargets, resolveKidsJourneyTarget } from './kids-journey-targets.mjs'

describe('closed canonical rollout targets', () => {
  test('existing default remains staging; production is an explicit, immutable provider identity', () => {
    expect(resolveKidsJourneyTarget()).toBe(kidsJourneyTargets.staging)
    expect(resolveKidsJourneyTarget('staging').environment).toBe(
      'f634cff6-aafb-4804-8b69-172fad4e946e',
    )
    expect(resolveKidsJourneyTarget('production')).toEqual({
      project: '415d5a1c-5f75-432c-8445-b395d0977ce3',
      environment: '19c212a5-85c0-493c-9630-a7a0569e8412',
      members: 'aa282801-ffba-477c-af6d-394b2f4f9af9',
      auth: '8c57d71d-3a8e-48f1-9627-63f1528b9a48',
    })
    expect(Object.isFrozen(kidsJourneyTargets)).toBe(true)
    expect(Object.isFrozen(kidsJourneyTargets.staging)).toBe(true)
    expect(Object.isFrozen(kidsJourneyTargets.production)).toBe(true)
  })
  test.each([
    '',
    'prod',
    'Production',
    'production ',
    '__proto__',
    'constructor',
    null,
    {},
    1,
  ])('refuses arbitrary or ambiguous target %p', (target) => {
    expect(() => Reflect.apply(resolveKidsJourneyTarget, undefined, [target])).toThrow('Destino')
  })
})

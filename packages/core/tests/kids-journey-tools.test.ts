import { expect, test } from 'bun:test'
import { JOURNEY_LEVEL_SLUGS } from '../src/journey/catalog'
import { type KidsJourneyView } from '../src/journey/kids-policy'
import { projectKidsJourney } from '../src/journey/kids-projection'
import { kidsCreativeToolAvailability } from '../src/journey/kids-tools'
import { creativeToolAvailability, type CreativeToolId } from '../src/journey/state'
import { kidsJourneyInput } from './fixtures/kids-journey'

const toolIds: CreativeToolId[] = ['estudio-completo', 'pinta', 'pensa', 'molda']
const base = (): KidsJourneyView => projectKidsJourney(kidsJourneyInput({ policyVersion: 1 }))

test('all eight initial ranks preserve the previous global tool availability', () => {
  for (const level of JOURNEY_LEVEL_SLUGS) {
    const journey = projectKidsJourney({ ...kidsJourneyInput({ policyVersion: 1 }), earned: {
      level, capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] },
    } })
    for (const tool of toolIds) {
      expect(kidsCreativeToolAvailability({ tool, owned: true, journey }).state)
        .toBe(creativeToolAvailability({ tool, owned: true, level }))
    }
  }
})

test('custom capabilities govern tools independently of rank, product and unavailable data', () => {
  const journey = base()
  journey.earned = { ...journey.earned, level: 'noob', capabilities: ['studio', 'pensa'] }
  expect(kidsCreativeToolAvailability({ tool: 'estudio-completo', owned: true, journey }).state).toBe('available')
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).state).toBe('career-locked')
  journey.earned = { ...journey.earned, level: 'god', capabilities: [] }
  expect(kidsCreativeToolAvailability({ tool: 'estudio-completo', owned: true, journey }).state).toBe('career-locked')
  expect(kidsCreativeToolAvailability({ tool: 'pinta', owned: false, journey }).state).toBe('not-included')
  expect(kidsCreativeToolAvailability({ tool: 'pinta', owned: null, journey }).state).toBe('unavailable')
  expect(kidsCreativeToolAvailability({ tool: 'pinta', owned: true, journey: null })).toEqual({ state: 'unavailable', requiredLevel: null })
})

test('future Pensa promise covers both its tool and AI, within the actual horizon', () => {
  const journey = base()
  journey.earned.capabilities = []
  journey.readiness = { status: 'ready', horizon: 'god', issues: [] }
  journey.advances = journey.advances.map((step): KidsJourneyView['advances'][number] => ({ ...step, capabilities:
    step.level === 'hacker' ? ['ai'] : step.level === 'god' ? ['pensa'] : [] }))
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).requiredLevel).toBe('god')
  journey.readiness.horizon = 'champion'
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).requiredLevel).toBeNull()
  journey.earned.capabilities = ['ai']
  journey.readiness.horizon = 'god'
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).requiredLevel).toBe('god')
  journey.mode = 'paused'
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).requiredLevel).toBeNull()
  journey.mode = 'active'
  journey.advances = journey.advances.map((step) => ({ ...step, capabilities: [] }))
  expect(kidsCreativeToolAvailability({ tool: 'pensa', owned: true, journey }).requiredLevel).toBeNull()
})

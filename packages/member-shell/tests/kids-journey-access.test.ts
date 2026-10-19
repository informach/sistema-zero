import { expect, test } from 'bun:test'
import type {
  KidsCreatorCapability,
  KidsJourneyStaffPreview,
  KidsJourneyView,
} from '@sistemazero/core/journey'
import {
  initialKidsJourneyPolicy,
  JOURNEY_LEVEL_SLUGS,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { isBlockTypeAllowed } from '../../studio/src/core/levels'
import { hasKidsCapability, kidsJourneyAccess } from '../src/lib/kids-journey-access'
import { kidsStudioTier } from '../src/server/studio-unlocks'
import { resolveStudioTier as legacyStudioTier } from './fixtures/legacy-studio-tier'

function child(level: 'noob' | 'god', capabilities: KidsCreatorCapability[]): KidsJourneyView {
  return {
    audience: 'kids',
    policyVersion: 2,
    mode: 'active',
    tierAccess: initialKidsJourneyPolicy().tierAccess,
    earned: { level, capabilities, courseAccess: { entry: [], expanded: [], reward: [] } },
    nextLevel: null,
    missing: [],
    advances: [],
    readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
  }
}

const preview: KidsJourneyStaffPreview = {
  audience: 'kids',
  kind: 'staff-preview',
  policyVersion: 2,
  mode: 'active',
  tierAccess: initialKidsJourneyPolicy().tierAccess,
  capabilities: ['studio', 'bridge', 'pro', 'ai', 'pensa', 'pinta', 'molda'],
  readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
}

test('the canonical tier mapping must be present and complete before any Kids consumer reads it', () => {
  const view = child('noob', [])
  for (const tierAccess of [
    undefined,
    [],
    view.tierAccess.map(() => view.tierAccess[0]),
    view.tierAccess.map((rule, i) => (i === 0 ? { ...rule, opensAt: 'unknown' } : rule)),
  ]) {
    const invalid = { ...view, tierAccess } as unknown as KidsJourneyView
    expect(kidsJourneyAccess({ kidsJourney: invalid }) === null).toBe(true)
  }
})

test('capabilities govern Kids modes independently of rank, without granting curriculum blocks', () => {
  const lowRank = child('noob', ['studio', 'bridge', 'pro'])
  const highRank = child('god', [])
  const tier = kidsStudioTier(lowRank, ['sz_g2d_create_ship', 'sz_g2d_create_ship', 'removed-id'])
  expect(tier).toMatchObject({
    freeStudio: true,
    pro: true,
    bridge: true,
    hasPalette: true,
    allowBlocks: ['sz_g2d_create_ship'],
    allowedExtensions: ['game-2d'],
    initialExtensions: [],
  })
  expect(tier.allowedModes).toEqual(['blocks', 'bridge'])
  expect(kidsStudioTier(highRank, ['sz_g2d_create_ship'])).toMatchObject({
    freeStudio: false,
    pro: false,
    bridge: false,
  })
  expect(kidsStudioTier(lowRank, ['removed-id'])).toMatchObject({
    hasPalette: false,
    allowBlocks: [],
  })
  expect(hasKidsCapability(lowRank, 'ai')).toBe(false)
})

test('actual empty capabilities remain a valid child; absence and unavailable policy are explicit', () => {
  const noob = child('noob', [])
  expect(kidsJourneyAccess({ kidsJourney: noob })).toBe(noob)
  expect(kidsJourneyAccess(undefined)).toBeNull()
  expect(kidsJourneyAccess({})).toBeNull()
  expect(kidsJourneyAccess({ kidsJourney: { ...noob, policyVersion: 0 } })).toBeNull()
  expect(
    kidsJourneyAccess({
      kidsJourney: { ...noob, readiness: { status: 'unavailable', horizon: null, issues: [] } },
    }),
  ).toBeNull()
  expect(kidsJourneyAccess({ kidsJourney: noob, kidsPreview: preview })).toBeNull()
  expect(
    kidsJourneyAccess({ kidsJourney: { ...noob, readiness: null } as unknown as KidsJourneyView }),
  ).toBeNull()
  expect(
    kidsJourneyAccess({ kidsJourney: { ...noob, earned: null } as unknown as KidsJourneyView }),
  ).toBeNull()
})

test('only explicit persisted staff preview exposes the full curriculum catalog, without a virtual rank', () => {
  expect(kidsJourneyAccess({ kidsPreview: preview })).toBe(preview)
  const tier = kidsStudioTier(preview, [])
  expect(tier).toMatchObject({ freeStudio: true, pro: true, bridge: true, hasPalette: true })
  expect(tier).not.toHaveProperty('allowBlocks')
  expect(tier.allowedExtensions).toContain('game-3d')
  expect(preview).not.toHaveProperty('earned')
})

test('the persisted initial policy keeps the previous modes and curriculum rights at all eight ranks', () => {
  for (const level of JOURNEY_LEVEL_SLUGS) {
    const journey = projectKidsJourney({
      policy: initialKidsJourneyPolicy(),
      policyVersion: 1,
      catalog: [],
      milestones: [],
      earned: { level, capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] } },
    })
    const blocks = ['sz_g2d_create_ship']
    const actual = kidsStudioTier(journey, blocks)
    const previous = legacyStudioTier(level, undefined, { blocks, extensions: ['game-2d'] })
    for (const key of [
      'freeStudio',
      'bridge',
      'pro',
      'canCreateProProject',
      'canPromoteToPro',
      'allowedModes',
      'allowBlocks',
      'allowedExtensions',
      'initialExtensions',
    ] as const)
      expect(actual[key], `${level}.${key}`).toEqual(previous[key])
    // Explicit palettes restrict the real Studio even though its catalog geometry has a high ceiling.
    const profile = { level: actual.level, allowBlocks: actual.allowBlocks }
    expect(isBlockTypeAllowed('sz_g2d_create_ship', 'iniciante-2d', profile)).toBe(true)
    expect(isBlockTypeAllowed('sz_js_class', 'avancado-2d', profile)).toBe(false)
  }
})

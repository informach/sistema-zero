import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  type KidsCreatorCapability,
  type KidsJourneyView,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { CelebrationWatcher } from '../src/components/kids/celebration-watcher'
import { facts } from './fixtures/canonical-journey-map'

const profile = 'canonical-celebration-profile'
const levelKey = `sz:kids:level:${profile}`
const capabilitiesKey = `sz:kids:capabilities:${profile}`
beforeEach(() => localStorage.clear())
afterEach(cleanup)

function journey(
  level: 'coder' | 'architect',
  molda: boolean,
  completeOnly = false,
): KidsJourneyView {
  const seed = initialKidsJourneyPolicy()
  const policy = {
    ...seed,
    steps: seed.steps.map((step) => ({
      ...step,
      capabilities: [
        ...step.capabilities.filter((capability) => !capability.startsWith('molda')),
        ...(step.level === 'coder' && molda ? ['molda' as const] : []),
      ],
      requirements:
        step.level === 'coder' && completeOnly
          ? step.requirements.map((requirement) => ({
              ...requirement,
              milestone: 'complete' as const,
            }))
          : step.requirements,
    })),
  }
  const entry = facts.find((fact) => fact.tier === 'primeiros-passos-2d')!
  return projectKidsJourney({
    policy,
    policyVersion: 3,
    catalog: facts,
    milestones: completeOnly
      ? [
          {
            courseId: entry.id,
            completed: true,
            showcased: false,
            qualifiedTier: entry.tier,
            qualifiedSlot: entry.slot,
          },
        ]
      : [],
    earned: {
      level: completeOnly ? 'noob' : level,
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
}
function seen(level: string, capabilities: KidsCreatorCapability[] = []) {
  localStorage.setItem(levelKey, level)
  localStorage.setItem(capabilitiesKey, JSON.stringify({ version: 1, capabilities }))
}
function show(
  view: KidsJourneyView | null,
  legacyLevelSlug = view?.earned.level,
  profileKey = profile,
) {
  // An isolated old scalar is deliberately ignored, even if a caller accidentally retains it.
  const proposed = { journey: view, ownsMolda: true, levelSlug: legacyLevelSlug }
  return render(
    <CelebrationWatcher
      {...proposed}
      ownsStudio={false}
      toolsRevision={null}
      profileKey={profileKey}
    />,
  )
}

test('canonical celebration: custom Coder actually gaining Molda announces its real capability', async () => {
  const view = journey('coder', true)
  expect(view.earned.capabilities).toContain('molda')
  seen('noob')
  show(view)
  await screen.findByRole('dialog')
  expect(screen.queryByText(/No Molda:/) !== null).toBe(true)
})

test('canonical celebration: Architect without Molda never promises the old fixed band', async () => {
  const view = journey('architect', false)
  expect(view.earned.capabilities.includes('molda')).toBe(false)
  seen('elite', ['studio', 'pinta', 'ai', 'pensa'])
  show(view)
  await screen.findByRole('dialog')
  expect(screen.queryByText(/No Molda:/) === null).toBe(true)
})

test('canonical celebration: complete-only promotion does not claim a publication that never happened', async () => {
  const view = journey('coder', false, true)
  expect(view.earned.level).toBe('coder')
  seen('noob')
  show(view)
  await screen.findByRole('dialog')
  expect(screen.queryByText(/publicou o seu primeiro projeto/) === null).toBe(true)
})

test('canonical celebration: unavailable policy ignores an isolated old rank signal and preserves storage', async () => {
  seen('noob', ['studio'])
  const capabilities = localStorage.getItem(capabilitiesKey)
  show(null, 'coder')
  await act(async () => {
    await Promise.resolve()
  })
  expect(localStorage.getItem(levelKey)).toBe('noob')
  expect(localStorage.getItem(capabilitiesKey)).toBe(capabilities)
  expect(screen.queryByRole('dialog') === null).toBe(true)
})

test('canonical celebration: first visit records the real rank without a retrospective party', async () => {
  show(journey('coder', true))
  await waitFor(() => expect(localStorage.getItem(levelKey)).toBe('coder'))
  expect(screen.queryByRole('dialog') === null).toBe(true)
})

test('canonical celebration: another profile never overwrites or borrows the previous profile snapshot', async () => {
  seen('god', ['studio', 'pro', 'molda'])
  const before = localStorage.getItem(capabilitiesKey)
  show(journey('coder', true), 'coder', 'other-canonical-profile')
  await waitFor(() =>
    expect(localStorage.getItem('sz:kids:level:other-canonical-profile')).toBe('coder'),
  )
  expect(localStorage.getItem(levelKey)).toBe('god')
  expect(localStorage.getItem(capabilitiesKey)).toBe(before)
  expect(screen.queryByRole('dialog') === null).toBe(true)
})

test('canonical celebration: an older loaded view cannot lower the locally observed rank or capabilities', async () => {
  seen('god', ['studio', 'pro', 'molda'])
  show(journey('coder', false))
  await act(async () => {
    await Promise.resolve()
  })
  expect(localStorage.getItem(levelKey)).toBe('god')
  expect(JSON.parse(localStorage.getItem(capabilitiesKey)!).capabilities).toContain('pro')
  expect(screen.queryByRole('dialog') === null).toBe(true)
})

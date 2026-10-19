import { afterEach, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  JOURNEY_COURSE_TIERS,
  journeySlotsForTier,
  type KidsJourneyCourseFact,
  type KidsJourneyPolicy,
  type KidsJourneyView,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { CreatorJourneyCard } from '../src/components/kids/creator-journey-card'
import { JourneyTimeline } from '../src/components/kids/journey-timeline'
import { canonicalJourneyProgress } from '../src/lib/journey-presentation'
import type { GamificationMeView } from '../src/lib/types'
import { AUTHORING_VOCABULARY_EXCEPTIONS } from './fixtures/authoring-vocabulary'
import { kidsStaffPreview } from './kids-journey-fixtures'

afterEach(cleanup)

const facts: KidsJourneyCourseFact[] = JOURNEY_COURSE_TIERS.flatMap((tier, tierIndex) =>
  Array.from({ length: journeySlotsForTier(tier) }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(tierIndex * 10 + index + 1).padStart(12, '0')}`,
    tier,
    slot: index + 1,
    audience: 'kids',
    modality: 'recorded',
    status: 'published',
    graduationOnly: false,
    journeyRole: 'positioned',
    hasShowcaseBlock: true,
  })),
)

function journey(policy = initialKidsJourneyPolicy()): KidsJourneyView {
  return projectKidsJourney({
    policy,
    policyVersion: 2,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'coder',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
}
function gamification(view: KidsJourneyView | null): GamificationMeView {
  return {
    xp: 25,
    streak: { current: 1, best: 1, activeToday: true },
    badges: [],
    ...(view ? { kidsJourney: view } : {}),
    level: view
      ? {
          slug: view.earned.level,
          next: view.nextLevel,
          remaining: {
            any: 0,
            'primeiros-passos-2d': 0,
            'iniciante-2d': 8,
            'iniciante-3d': 0,
            'intermediario-2d': 0,
            'intermediario-3d': 0,
            'avancado-2d': 0,
            'avancado-3d': 0,
          },
        }
      : null,
  }
}
function currentText() {
  return screen.getByText('Você está aqui').closest('li')?.textContent ?? ''
}

test('canonical child UI never renders raw authoring or protocol diagnostics from metadata', () => {
  const view = journey()
  const messages = AUTHORING_VOCABULARY_EXCEPTIONS.flatMap((entry) => entry.trechos)
  view.readiness = {
    ...view.readiness,
    status: 'incomplete',
    issues: messages.map((message) => ({
      code: 'invalid-policy',
      level: null,
      requirementIndex: null,
      severity: 'error',
      message,
    })),
  }
  const { container } = render(
    <>
      <JourneyTimeline gamification={gamification(view)} />
      <CreatorJourneyCard gamification={gamification(view)} />
    </>,
  )
  expect(container.textContent).toContain('Construtor(a)')
  for (const message of messages) expect(container.textContent).not.toContain(message)
  expect(container.textContent).not.toMatch(/\baula\b|\bcurso\b|\betapa\b/i)
})

test('canonical timeline: missing policy is explicit and never fabricates a Faísca learner', () => {
  const { container } = render(<JourneyTimeline gamification={gamification(null)} />)
  expect(container.textContent).toContain('Não foi possível consultar sua jornada agora')
  expect(screen.queryByText('Faísca') === null).toBe(true)
})

test('canonical timeline: own staff preview has no learner rank or virtual progression', () => {
  const gam = { ...gamification(null), kidsPreview: kidsStaffPreview }
  const { container } = render(<JourneyTimeline gamification={gam} />)
  expect(container.textContent).toContain('Prévia da equipe')
  expect(screen.queryByText('Faísca') === null).toBe(true)
  expect(screen.queryByText('Você está aqui') === null).toBe(true)
})

test('canonical timeline: custom Coder award announces actual AI, not fixed Studio/Pinta', () => {
  const seed = initialKidsJourneyPolicy()
  const policy: KidsJourneyPolicy = {
    ...seed,
    steps: seed.steps.map((step, index) => ({
      ...step,
      capabilities:
        index === 0 ? ['ai'] : index === 1 ? ['studio', 'pinta', 'pensa'] : step.capabilities,
    })),
  }
  render(<JourneyTimeline gamification={gamification(journey(policy))} />)
  expect(currentText()).toContain('Zappy')
  expect(currentText()).not.toContain('Estúdio livre + Pinta')
})

test('canonical timeline: complete-only promotion does not demand Mural publication', () => {
  const seed = initialKidsJourneyPolicy()
  const policy: KidsJourneyPolicy = {
    ...seed,
    steps: seed.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: step.requirements.map((requirement) => ({
              ...requirement,
              milestone: 'complete',
            })),
          }
        : step,
    ),
  }
  render(<JourneyTimeline gamification={gamification(journey(policy))} />)
  expect(currentText()).toContain('Termine')
  expect(currentText()).not.toContain('Mural')
})

test('canonical timeline: persisted horizon governs future promises independently from the loaded catalog', () => {
  const seed = initialKidsJourneyPolicy()
  const view = journey({
    ...seed,
    steps: seed.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: [
              {
                kind: 'course',
                courseId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
                milestone: 'complete',
              },
            ],
          }
        : step,
    ),
  })
  expect(view.readiness.horizon).toBe('coder')
  render(<JourneyTimeline gamification={gamification(view)} />)
  expect(screen.queryByText('Inventor(a)') === null).toBe(true)
  expect(screen.getByText('Construtor(a)')).toBeTruthy()
})

test('canonical timeline: the initial published policy retains the eight rank identities', () => {
  const { container } = render(<JourneyTimeline gamification={gamification(journey())} />)
  for (const label of [
    'Faísca',
    'Construtor(a)',
    'Inventor(a)',
    'Explorador(a) de Mundos',
    'Mestre dos Jogos',
    'Arquiteto(a) de Mundos',
    'Gênio da Criação',
    'Lenda',
  ])
    expect(container.textContent).toContain(label)
})

test('canonical card: missing policy does not use the nullable badge fallback', () => {
  const { container } = render(<CreatorJourneyCard gamification={gamification(null)} />)
  expect(container.textContent).toContain('Não foi possível consultar sua jornada agora')
  expect(screen.queryByText('Faísca') === null).toBe(true)
  expect(container.querySelector('.kids-aura')).toBeNull()
})

test('canonical card: team preview has no learner badge or virtual rewards', () => {
  const { container } = render(
    <CreatorJourneyCard gamification={{ ...gamification(null), kidsPreview: kidsStaffPreview }} />,
  )
  expect(container.textContent).toContain('Prévia da equipe')
  expect(screen.queryByText('Faísca') === null).toBe(true)
  expect(container.querySelector('.kids-aura')).toBeNull()
})

test('canonical card: aura follows persisted earned rank instead of a stale summary badge', () => {
  const view = journey()
  const gam = gamification(view)
  gam.level = gam.level ? { ...gam.level, slug: 'god' } : null
  const { container } = render(<CreatorJourneyCard gamification={gam} />)
  expect(container.querySelector('.kids-aura')?.getAttribute('style')).toContain('--level-coder')
  expect(container.querySelector('.kids-aura')?.getAttribute('style')).not.toContain('--level-god')
})

test('canonical presentation: lower horizon preserves every earned rank and retained tool', () => {
  const seed = initialKidsJourneyPolicy()
  const policy: KidsJourneyPolicy = {
    ...seed,
    steps: seed.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              {
                kind: 'course',
                courseId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
                milestone: 'complete',
              },
            ],
          }
        : step,
    ),
  }
  const view = projectKidsJourney({
    policy,
    policyVersion: 3,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'god',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
  expect(view.readiness.horizon).toBe('noob')
  const { container } = render(
    <>
      <CreatorJourneyCard gamification={gamification(view)} />
      <JourneyTimeline gamification={gamification(view)} />
    </>,
  )
  expect(screen.getAllByText('Lenda').length).toBe(2)
  expect(container.textContent).toContain('Modo Pro')
  expect(container.textContent).toContain('Modo Ponte')
  expect(container.textContent).toContain('Ferramentas avançadas do Molda')
})

test('canonical presentation: policy removal does not erase retained capabilities from the UI', () => {
  const seed = initialKidsJourneyPolicy()
  const view = projectKidsJourney({
    policy: { ...seed, steps: seed.steps.map((step) => ({ ...step, capabilities: [] })) },
    policyVersion: 3,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'coder',
      capabilities: ['studio', 'pinta'],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
  const { container } = render(
    <>
      <CreatorJourneyCard gamification={gamification(view)} />
      <JourneyTimeline gamification={gamification(view)} />
    </>,
  )
  expect(container.textContent).toContain('Conquistas guardadas:')
  expect(container.textContent).toContain('Estúdio livre + Pinta')
  expect(screen.getAllByText('Construtor(a)').length).toBe(2)
})

test('canonical hint: mixed course milestones name completion and publication separately', () => {
  const bonus: KidsJourneyCourseFact = {
    id: 'ffffffff-ffff-4fff-8fff-fffffffffff0',
    audience: 'kids',
    modality: 'recorded',
    status: 'published',
    graduationOnly: false,
    tier: null,
    slot: null,
    journeyRole: 'extra',
    hasShowcaseBlock: false,
  }
  const seed = initialKidsJourneyPolicy()
  const policy: KidsJourneyPolicy = {
    ...seed,
    steps: seed.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: [
              step.requirements[0]!,
              { kind: 'course', courseId: bonus.id, milestone: 'complete' },
            ],
          }
        : step,
    ),
  }
  const view = projectKidsJourney({
    policy,
    policyVersion: 3,
    catalog: [...facts, bonus],
    milestones: [],
    earned: {
      level: 'coder',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
  expect(canonicalJourneyProgress(view)).toMatchObject({
    kind: 'pending',
    remaining: 2,
    hint: 'Faltam 2 aventuras para você virar Inventor(a). Termine 1 aventura e publique 1 jogo no Mural.',
  })
})

test('canonical hint: pause retains the learner but makes no promotion promise', () => {
  const seed = initialKidsJourneyPolicy()
  const view = journey({ ...seed, mode: 'paused' })
  const progress = canonicalJourneyProgress(view)
  expect(progress.kind).toBe('paused')
  expect(progress.hint).toContain('conquistas estão guardadas')
  expect(progress.hint?.includes('Mural')).toBe(false)
})

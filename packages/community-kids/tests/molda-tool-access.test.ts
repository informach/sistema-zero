import { describe, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  JOURNEY_COURSE_TIERS,
  type JourneyLevelSlug,
  journeySlotsForTier,
  type KidsJourneyView,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { MOLDA_TOOL_BAND_LEVELS } from '../../core/tests/fixtures/legacy-kids-tool-levels'
import { MOLDA_TOOL_BANDS, moldaToolFamilyIds } from '../../molda/src/core/toolFamilies'
import { LEVEL_ORDER } from '../src/lib/level-info'
import {
  MOLDA_BAND_PROMISES,
  moldaCapabilitiesGain,
  moldaFeatureList,
} from '../src/lib/molda-level-gain'
import { MOLDA_BEYOND_HORIZON, moldaToolAccessFor } from '../src/lib/molda-tool-access'
import { JOURNEY_REWARD_INFO } from './fixtures/legacy-journey-rewards'
import { kidsStaffPreview } from './kids-journey-fixtures'

const basic = moldaToolFamilyIds(['basic'])
const intermediate = moldaToolFamilyIds(['intermediate'])
const professional = moldaToolFamilyIds(['professional'])
const catalog = JOURNEY_COURSE_TIERS.flatMap((tier, index) =>
  Array.from({ length: journeySlotsForTier(tier) }, (_, slot) => ({
    id: `00000000-0000-4000-8000-${String(index * 10 + slot + 1).padStart(12, '0')}`,
    audience: 'kids' as const,
    modality: 'recorded' as const,
    status: 'published' as const,
    tier,
    slot: slot + 1,
    journeyRole: 'positioned' as const,
    graduationOnly: false,
    hasShowcaseBlock: true,
  })),
)
function seedView(level: JourneyLevelSlug): KidsJourneyView {
  return projectKidsJourney({
    policy: initialKidsJourneyPolicy(),
    policyVersion: 1,
    catalog,
    milestones: [],
    earned: { level, capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] } },
  })
}

describe('moldaToolAccessFor', () => {
  test('seed keeps all eight rank boundaries and only explicit preview opens every family', () => {
    const expected = {
      noob: [],
      coder: [],
      hacker: [],
      explorer: basic,
      elite: basic,
      architect: [...basic, ...intermediate],
      champion: [...basic, ...intermediate],
      god: 'all',
    } as const
    for (const level of LEVEL_ORDER) {
      const access = moldaToolAccessFor({ journey: seedView(level) })
      if (expected[level] === 'all') expect(access).toBeUndefined()
      else expect(access?.allow).toEqual(expected[level])
    }
    const full = {
      ...kidsStaffPreview,
      capabilities: [
        ...kidsStaffPreview.capabilities,
        'molda-intermediate',
        'molda-professional',
      ] as const,
    }
    expect(moldaToolAccessFor({ journey: full })).toBeUndefined()
  })

  test('basic controls include component editing and imports without intermediate or professional tools', () => {
    const access = moldaToolAccessFor({ journey: seedView('explorer') })!
    for (const id of [
      'model.coordinates',
      'model.pivot',
      'model.components',
      'model.cut',
      'model.locator',
      'model.reference',
      'files.import',
    ])
      expect(access.allow).toContain(id)
    for (const id of ['model.precise', 'files.interop', 'animate.batch', 'model.skin', 'paint.uv'])
      expect(access.allow).not.toContain(id)
  })

  test('published seed announcements retain the actual reachable rank names', () => {
    expect(moldaToolAccessFor({ journey: seedView('explorer') })?.upcoming).toEqual([
      { when: 'Abrem no nível Arquiteto(a) de Mundos', families: intermediate },
      { when: 'Abrem no nível Lenda', families: professional },
    ])
  })

  test('custom capabilities and their future award replace all fixed rank thresholds', () => {
    const journey = seedView('noob')
    journey.earned.capabilities = ['molda', 'molda-intermediate']
    journey.advances = journey.advances.map((advance) => ({
      ...advance,
      capabilities: advance.level === 'hacker' ? ['molda-professional'] : [],
    }))
    const access = moldaToolAccessFor({ journey })
    expect(access?.allow).toEqual([...basic, ...intermediate])
    expect(access?.upcoming).toEqual([
      { when: 'Abrem no nível Inventor(a)', families: professional },
    ])
    expect(
      moldaToolAccessFor({
        journey: {
          ...seedView('god'),
          earned: { ...journey.earned, level: 'god', capabilities: [] },
        },
      })?.allow,
    ).toEqual([])
  })

  test('unknown horizon, removed awards and paused progression do not promise a fixed future rank', () => {
    for (const journey of [
      {
        ...seedView('explorer'),
        readiness: { status: 'incomplete' as const, horizon: null, issues: [] },
      },
      { ...seedView('explorer'), advances: [] },
      { ...seedView('explorer'), mode: 'paused' as const },
    ])
      expect(moldaToolAccessFor({ journey })?.upcoming).toEqual([
        { when: MOLDA_BEYOND_HORIZON, families: [...intermediate, ...professional] },
      ])
  })
})

describe('moldaCapabilitiesGain', () => {
  test('o seed mantém as faixas nos mesmos postos, comparando capacidades reais anteriores e atuais', () => {
    for (const level of LEVEL_ORDER) {
      const index = LEVEL_ORDER.indexOf(level)
      const previous = LEVEL_ORDER[index - 1]
      const gain = moldaCapabilitiesGain(
        previous ? seedView(previous).earned.capabilities : [],
        seedView(level).earned.capabilities,
      )
      if (level === 'explorer') expect(gain).toContain('oficina 3D')
      else if (level === 'architect') expect(gain).toContain('a malha')
      else if (level === 'god') expect(gain).toContain('os ossos')
      else expect(gain, level).toBeNull()
    }
  })
})

describe('a promessa do Molda é uma só e é verdade', () => {
  test('cada família prometida abre de fato naquela faixa do pacote', () => {
    for (const band of MOLDA_TOOL_BANDS) {
      const promise = MOLDA_BAND_PROMISES[band]
      expect(promise.features.length, band).toBe(promise.families.length)
      for (const family of promise.families)
        expect(moldaToolFamilyIds([band]) as readonly string[], `${band}: ${family}`).toContain(
          family,
        )
    }
  })

  test('a comemoração e as recompensas da jornada dizem a mesma lista', () => {
    for (const band of MOLDA_TOOL_BANDS) {
      const level = MOLDA_TOOL_BAND_LEVELS[band]
      const previous = LEVEL_ORDER[LEVEL_ORDER.indexOf(level as JourneyLevelSlug) - 1]
      expect(
        moldaCapabilitiesGain(
          previous ? seedView(previous).earned.capabilities : [],
          seedView(level as JourneyLevelSlug).earned.capabilities,
        ),
        band,
      ).toContain(moldaFeatureList(band))
      if (band === 'basic') continue
      expect(
        JOURNEY_REWARD_INFO[level as keyof typeof JOURNEY_REWARD_INFO].description,
        band,
      ).toContain(moldaFeatureList(band))
    }
  })
})

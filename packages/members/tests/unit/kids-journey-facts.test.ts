import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { KidsJourneyCatalogCourse } from '../../src/domain/ports/kids-journey-repository.port'
import {
  type KidsJourneyEventFact,
  kidsMilestonesFromEvents,
} from '../../src/infrastructure/persistence/drizzle/kids-journey-facts'

describe('Kids journey ledger adapter', () => {
  const userId = randomUUID()
  const courseId = randomUUID()
  const catalog: KidsJourneyCatalogCourse[] = [
    {
      id: courseId,
      level: 'iniciante',
      track: '3d',
      tier: 'iniciante-3d',
      slot: 4,
      graduationOnly: false,
      audience: 'kids',
      status: 'published',
      modality: 'recorded',
      journeyRole: 'positioned',
      hasShowcaseBlock: true,
    },
  ]
  const event = (overrides: Partial<KidsJourneyEventFact> = {}): KidsJourneyEventFact => ({
    userId,
    courseId,
    sourceType: 'course_complete',
    sourceLevel: null,
    sourceTrack: null,
    sourceCareerSlot: null,
    ...overrides,
  })

  test('resolves complete-only legacy rows from the captured catalog', () => {
    expect(kidsMilestonesFromEvents([event()], catalog).get(userId)).toEqual([
      {
        courseId,
        completed: true,
        showcased: false,
        qualifiedTier: 'iniciante-3d',
        qualifiedSlot: 4,
      },
    ])
  })

  test('chooses showcase then complete then catalog, independently for each snapshot field', () => {
    const result = kidsMilestonesFromEvents(
      [
        event({ sourceLevel: 'intermediario', sourceCareerSlot: 2 }),
        event({ sourceType: 'course_showcased', sourceTrack: '2d' }),
      ],
      catalog,
    ).get(userId)![0]
    expect(result).toEqual({
      courseId,
      completed: true,
      showcased: true,
      qualifiedTier: 'intermediario-2d',
      qualifiedSlot: 2,
    })
  })

  test('preserves a deleted course from snapshots, with the historical 2d fallback', () => {
    expect(
      kidsMilestonesFromEvents(
        [event({ sourceLevel: 'primeiros-passos', sourceCareerSlot: 1 })],
        [],
      ).get(userId)![0],
    ).toMatchObject({ qualifiedTier: 'primeiros-passos-2d', qualifiedSlot: 1 })
  })

  test('does not join complete/showcase across different courses or profiles', () => {
    const sibling = randomUUID()
    const another = randomUUID()
    const result = kidsMilestonesFromEvents(
      [
        event(),
        event({ userId: sibling, sourceType: 'course_showcased' }),
        event({ courseId: another, sourceType: 'course_showcased' }),
      ],
      catalog,
    )
    expect(result.get(userId)).toHaveLength(2)
    expect(result.get(userId)![0]).toMatchObject({ completed: true, showcased: false })
    expect(result.get(userId)![1]).toMatchObject({ completed: false, showcased: true })
    expect(result.get(sibling)![0]).toMatchObject({ completed: false, showcased: true })
  })

  test('keeps a legacy event with no tags as course evidence, without inventing a slot', () => {
    expect(kidsMilestonesFromEvents([event()], []).get(userId)![0]).toMatchObject({
      completed: true,
      qualifiedTier: null,
      qualifiedSlot: null,
    })
  })

  test('formatura and a normal level-track pair outside the ladder never qualify a slot', () => {
    for (const tags of [
      { sourceLevel: 'lenda', sourceTrack: '2d' },
      { sourceLevel: 'primeiros-passos', sourceTrack: '3d' },
    ] as const)
      expect(
        kidsMilestonesFromEvents([event({ ...tags, sourceCareerSlot: 1 })], []).get(userId)![0],
      ).toMatchObject({ qualifiedTier: null, qualifiedSlot: null })
  })
})

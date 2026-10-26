import {
  CREATOR_MASTERY_IDS,
  CREATOR_POST_LEVELS,
  type CreatorJourneyCourseFact,
  type CreatorJourneyCurriculum,
  creatorJourneyCourseIds,
} from '../../src/journey'

export const creatorCourseId = (value: number) =>
  `10000000-0000-4000-8000-${String(value).padStart(12, '0')}`
export function creatorCurriculumFixture(): CreatorJourneyCurriculum {
  return {
    schemaVersion: 1,
    stages: CREATOR_POST_LEVELS.map((level, index) => {
      const offset = 1 + index * 20
      return {
        level,
        title: level,
        base2dCourseId: creatorCourseId(offset),
        base3dCourseId: creatorCourseId(offset + 1),
        missionCourseId: creatorCourseId(offset + 2),
        powers: [
          {
            mechanicId: 'timer',
            title: 'Relógio',
            courseIds: [creatorCourseId(offset + 3), creatorCourseId(offset + 4)],
          },
          { mechanicId: 'counter', title: 'Contador', courseIds: [creatorCourseId(offset + 5)] },
          {
            mechanicId: 'inventory',
            title: 'Inventário',
            courseIds: [creatorCourseId(offset + 6)],
          },
        ],
        minimumPowers: index === 0 ? 1 : 2,
        extras: [{ courseId: creatorCourseId(offset + 7), title: 'Extra' }],
        grants: index === 0 ? [{ after: 'base2d', capabilities: ['studio', 'pinta'] }] : [],
      }
    }),
    masteries: CREATOR_MASTERY_IDS.map((id, masteryIndex) => ({
      id,
      title: id,
      opensAfterPair: 'coder',
      levels: ([1, 2, 3] as const).map((level) => {
        const offset = 1000 + masteryIndex * 100 + level * 10
        return {
          level,
          title: `Nível ${level}`,
          nucleusCourseIds: [creatorCourseId(offset)],
          workshops: [1, 2, 3].map((index) => ({
            id: `workshop-${index}`,
            title: `Oficina ${index}`,
            courseIds: [creatorCourseId(offset + index)],
          })),
          rubric: {
            version: 1,
            criteria: [
              { id: 'working', title: 'O jogo funciona' },
              { id: 'explained', title: 'Explica a regra' },
            ],
          },
        }
      }),
    })),
  }
}
export function creatorCatalogFixture(
  curriculum = creatorCurriculumFixture(),
  audience: 'kids' | 'adult' = 'kids',
): CreatorJourneyCourseFact[] {
  return creatorJourneyCourseIds(curriculum).map((id) => ({
    id,
    audience,
    modality: 'recorded',
    status: 'published',
  }))
}
export function creatorPostCompletions(
  curriculum: CreatorJourneyCurriculum,
  postIndex: number,
): string[] {
  const stage = curriculum.stages[postIndex]!
  return [
    stage.base2dCourseId,
    stage.base3dCourseId,
    stage.missionCourseId,
    ...stage.powers.slice(0, stage.minimumPowers).map((power) => power.courseIds[0]!),
  ]
}

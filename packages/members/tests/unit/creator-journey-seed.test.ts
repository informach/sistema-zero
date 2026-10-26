import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
} from '../../src/application/creator-journey/creator-journey-seed'
import type { Course } from '../../src/domain/course/course'

const spec = JSON.parse(
  readFileSync(
    new URL('../../src/infrastructure/config/creator-journey-curriculum.json', import.meta.url),
    'utf8',
  ),
) as CreatorEditorialSpec
const empty = buildCreatorJourneySeed(spec, [])

function courseFixture(input: Pick<Course, 'id' | 'slug' | 'audience'> & Partial<Course>): Course {
  return {
    version: 1,
    title: 'Curso existente',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'published',
    level: 'iniciante',
    track: '2d',
    careerSlot: null,
    journeyRole: 'extra',
    sequentialLock: true,
    videoBeforeActivity: false,
    modality: 'recorded',
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...input,
  }
}

test('full editorial plan has seven pairs, missions, grouped Powers and six three-level masteries per audience', () => {
  for (const audience of ['kids', 'adult'] as const) {
    const curriculum = empty.curricula[audience]
    expect(curriculum.stages).toHaveLength(7)
    expect(curriculum.stages.map((stage) => stage.minimumPowers)).toEqual([1, 2, 2, 2, 2, 2, 2])
    expect(curriculum.stages.flatMap((stage) => stage.powers)).toHaveLength(34)
    expect(curriculum.masteries).toHaveLength(6)
    expect(
      curriculum.masteries.every(
        (area) =>
          area.levels.length === 3 && area.levels.every((level) => level.workshops.length === 3),
      ),
    ).toBe(true)
    expect(curriculum.masteries.find((area) => area.id === 'python3d')?.opensAfterPair).toBe(
      'explorer',
    )
    expect(curriculum.masteries.find((area) => area.id === 'javascript2d')?.opensAfterPair).toBe(
      'coder',
    )
    expect(curriculum.masteries.find((area) => area.id === 'modelagem3d')?.opensAfterPair).toBe(
      'hacker',
    )
  }
  expect(new Set(empty.courses.map((course) => course.id)).size).toBe(empty.courses.length)
  expect(empty.courses.every((course) => course.outline.length > 0)).toBe(true)
  expect(buildCreatorJourneySeed(spec, []).curricula).toEqual(empty.curricula)
})

test('known slugs retain their actual UUID even when title, tags and metadata differ from the proposal', () => {
  const names = [
    'desafio-primeiro-jogo',
    'cade-todo-mundo',
    'nave-contra-asteroides',
    'corre-dino',
    'o-jogo-do-meu-jeito',
  ]
  const catalog = empty.courses
    .filter((course) =>
      names.some((slug) => course.slug === slug || course.slug === `${slug}-adulto`),
    )
    .map((course, index) =>
      courseFixture({
        id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
        slug: course.slug,
        audience: course.audience,
        modality: 'recorded',
        version: 17,
        title: 'Nome editado pela autora',
        status: 'published',
        metadata: { keep: true },
      }),
    )
  const before = structuredClone(catalog)
  const plan = buildCreatorJourneySeed(spec, catalog)
  expect(plan.preservedCourseIds).toHaveLength(10)
  for (const course of catalog) {
    expect(plan.courses.find((entry) => entry.slug === course.slug)).toMatchObject({
      id: course.id,
      action: 'reuse',
      version: 17,
    })
  }
  const kids = plan.curricula.kids.stages
  expect(kids[0]?.base2dCourseId).toBe(
    catalog.find((course) => course.slug === 'desafio-primeiro-jogo')?.id,
  )
  expect(kids[0]?.extras[0]?.courseId).toBe(
    catalog.find((course) => course.slug === 'cade-todo-mundo')?.id,
  )
  expect(kids[1]?.base2dCourseId).toBe(
    catalog.find((course) => course.slug === 'nave-contra-asteroides')?.id,
  )
  expect(kids[1]?.extras[0]?.courseId).toBe(
    catalog.find((course) => course.slug === 'o-jogo-do-meu-jeito')?.id,
  )
  expect(kids[2]?.base2dCourseId).toBe(catalog.find((course) => course.slug === 'corre-dino')?.id)
  expect(catalog).toEqual(before)
})

test('same slug in another audience or live modality cannot be silently reused', () => {
  const planned = empty.courses[0]!
  const course = courseFixture({
    id: planned.id,
    slug: planned.slug,
    audience: planned.audience,
    modality: 'live',
    version: 0,
  })
  expect(() => buildCreatorJourneySeed(spec, [course])).toThrow('outro público ou modalidade')
  expect(() =>
    buildCreatorJourneySeed(spec, [{ ...course, modality: 'recorded', audience: 'adult' }]),
  ).toThrow('outro público ou modalidade')
})

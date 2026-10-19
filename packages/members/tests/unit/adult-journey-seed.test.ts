import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { adultJourneyPosition, projectAdultJourney } from '@sistemazero/core/journey'
import { AdultJourneyService } from '../../src/application/adult-journey/adult-journey.service'
import {
  ADULT_JOURNEY_TEMPLATE,
  buildAdultJourneySeed,
  type SeedCourse,
} from '../../src/application/adult-journey/adult-journey-seed'
import type { Course } from '../../src/domain/course/course'
import { InMemoryAdultJourneyRepository } from '../fakes/adult-journey-in-memory'

function course(
  level: SeedCourse['level'],
  track: SeedCourse['track'],
  extra: Partial<SeedCourse> = {},
) {
  const id = randomUUID()
  return {
    id,
    slug: `curso-${id.slice(0, 6)}`,
    title: `Curso ${level} ${track} ${id.slice(0, 4)}`,
    status: 'published',
    audience: 'adult',
    modality: 'recorded',
    level,
    track,
    ...extra,
  } satisfies SeedCourse
}

const fullCatalog = [
  course('primeiros-passos', '2d'),
  course('iniciante', '2d'),
  course('iniciante', '2d'),
  course('iniciante', '3d'),
  course('intermediario', '2d'),
  course('intermediario', '3d'),
  course('avancado', '2d'),
  course('avancado', '3d'),
]

function at(index: number) {
  const item = fullCatalog[index]
  if (!item) throw new Error(`catálogo sem o curso ${index}`)
  return item
}

test('o modelo segue a ordem dos níveis e libera IA só junto de um curso avançado', () => {
  expect(ADULT_JOURNEY_TEMPLATE.map((stage) => stage.tier)).toEqual([
    'primeiros-passos-2d',
    'iniciante-2d',
    'iniciante-3d',
    'intermediario-2d',
    'intermediario-3d',
    'avancado-2d',
    'avancado-3d',
  ])
  const firstAi = ADULT_JOURNEY_TEMPLATE.findIndex((stage) =>
    stage.capabilities.some((capability) => capability === 'ai' || capability === 'pensa'),
  )
  expect(ADULT_JOURNEY_TEMPLATE[firstAi]?.tier.startsWith('avancado')).toBe(true)
})

test('uma etapa por nível, com todos os cursos publicados dele; o catálogo completo dá 8 posições', () => {
  const plan = buildAdultJourneySeed(fullCatalog)
  expect(plan.stoppedAt).toBeNull()
  expect(plan.policy.stages.map((stage) => stage.title)).toEqual(
    ADULT_JOURNEY_TEMPLATE.map((stage) => stage.title),
  )
  expect(plan.policy.stages[1]?.requirements).toHaveLength(2)
  // Sem curso com a atividade de publicar, ninguém fica preso esperando o Mural.
  expect(
    plan.policy.stages.every((stage) =>
      stage.requirements.every((requirement) => requirement.milestone === 'complete'),
    ),
  ).toBe(true)
  // 7 etapas + a posição de quem terminou tudo = "Etapa N de 8", como no Kids.
  expect(adultJourneyPosition(projectAdultJourney(plan.policy, 1, []))?.total).toBe(8)
})

test('rascunho, curso ao vivo, Kids e Lenda ficam de fora; para na primeira etapa sem curso', () => {
  const plan = buildAdultJourneySeed([
    course('primeiros-passos', '2d'),
    course('iniciante', '2d'),
    course('iniciante', '3d', { status: 'draft' }),
    course('iniciante', '3d', { modality: 'live' }),
    course('iniciante', '3d', { audience: 'kids' }),
    course('lenda', '2d'),
    course('intermediario', '2d'),
  ])
  expect(plan.policy.stages.map((stage) => stage.id)).toEqual(['aprendiz', 'construtor'])
  expect(plan.stoppedAt).toEqual({ title: 'Inventor(a)', tier: 'iniciante-3d' })
})

test('como no Kids: terminar e publicar no Mural no curso que tem a atividade de publicar', () => {
  const withMural = at(1)
  const withoutMural = at(2)
  const plan = buildAdultJourneySeed(fullCatalog, { showcaseCourseIds: new Set([withMural.id]) })
  const milestones = new Map(
    plan.policy.stages[1]?.requirements.map((r) => [r.courseId, r.milestone]),
  )
  expect(milestones.get(withMural.id)).toBe('showcase')
  expect(milestones.get(withoutMural.id)).toBe('complete')
  expect(plan.stages[1]?.courses.find((c) => c.slug === withMural.slug)?.milestone).toBe('showcase')
})

test('--milestone força a mesma régua em todos os cursos', () => {
  const showcase = new Set([at(0).id])
  const forced = buildAdultJourneySeed(fullCatalog, { milestone: 'showcase' })
  expect(
    forced.policy.stages.every((stage) =>
      stage.requirements.every((requirement) => requirement.milestone === 'showcase'),
    ),
  ).toBe(true)
  const complete = buildAdultJourneySeed(fullCatalog, {
    milestone: 'complete',
    showcaseCourseIds: showcase,
  })
  expect(complete.policy.stages[0]?.requirements[0]?.milestone).toBe('complete')
})

test('a validação do Admin aceita o plano montado (IA na etapa avançada)', async () => {
  const byId = new Map(fullCatalog.map((item) => [item.id, item]))
  const service = new AdultJourneyService(
    new InMemoryAdultJourneyRepository({ events: [] }),
    {
      findCourseById: async (id: string) => (byId.get(id) as unknown as Course | undefined) ?? null,
    },
    () => new Date('2026-10-19T12:00:00Z'),
  )
  const plan = buildAdultJourneySeed(fullCatalog)
  const saved = await service.configure(plan.policy, 0)
  expect(saved.version).toBe(1)
  expect((await service.policy()).policy.stages).toHaveLength(7)
})

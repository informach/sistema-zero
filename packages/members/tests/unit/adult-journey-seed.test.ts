import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { adultJourneyPosition, projectAdultJourney } from '@sistemazero/core/journey'
import { AdultJourneyService } from '../../src/application/adult-journey/adult-journey.service'
import {
  ADULT_JOURNEY_STANDALONE_COURSE_SLUGS,
  ADULT_JOURNEY_TEMPLATE,
  buildAdultJourneySeed,
  type SeedCourse,
} from '../../src/application/adult-journey/adult-journey-seed'
import { parseAdultJourneySeedArgs } from '../../src/application/adult-journey/adult-journey-seed-args'
import { runAdultJourneySeedOnce } from '../../src/application/adult-journey/adult-journey-seed-once'
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
  expect(plan.pendingStages).toEqual([])
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

test('rascunho, curso ao vivo, Kids e Lenda ficam de fora; etapas sem cursos continuam planejadas', () => {
  const plan = buildAdultJourneySeed([
    course('primeiros-passos', '2d'),
    course('iniciante', '2d'),
    course('iniciante', '3d', { status: 'draft' }),
    course('iniciante', '3d', { modality: 'live' }),
    course('iniciante', '3d', { audience: 'kids' }),
    course('lenda', '2d'),
    course('intermediario', '2d'),
  ])
  expect(plan.policy.stages).toHaveLength(7)
  expect(plan.policy.stages.map((stage) => stage.requirements.length)).toEqual([
    1, 1, 0, 1, 0, 0, 0,
  ])
  expect(plan.pendingStages.map((stage) => stage.tier)).toEqual([
    'iniciante-3d',
    'intermediario-3d',
    'avancado-2d',
    'avancado-3d',
  ])
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
      findCoursesByIds: async (ids: string[]) =>
        ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as unknown as Course] : [])),
    },
    () => new Date('2026-10-19T12:00:00Z'),
  )
  const plan = buildAdultJourneySeed(fullCatalog)
  const saved = await service.configure(plan.policy, 0)
  expect(saved.version).toBe(1)
  expect((await service.policy()).policy.stages).toHaveLength(7)
})

test('etapa de IA pode aguardar cursos, mas um vínculo novo continua exigindo curso avançado', async () => {
  const h = seedOnceHarness(fullCatalog)
  const plan = buildAdultJourneySeed([])
  await h.service.configure(plan.policy, 0)
  plan.policy.stages[5]!.requirements = [{ courseId: at(0).id, milestone: 'complete' }]
  await expect(h.service.configure(plan.policy, 1)).rejects.toThrow('curso adulto avançado')
  expect((await h.service.policy()).version).toBe(1)
  plan.policy.stages[5]!.requirements = [{ courseId: at(6).id, milestone: 'complete' }]
  expect((await h.service.configure(plan.policy, 1)).version).toBe(2)
  expect((await h.service.get(randomUUID())).capabilities).toEqual([])
})

test('produto avulso (No Comando da IA) nunca vira requisito de etapa, mesmo com nível e trilha', () => {
  expect(ADULT_JOURNEY_STANDALONE_COURSE_SLUGS).toContain('no-comando-da-ia')
  const standalone = course('iniciante', '2d', {
    slug: 'no-comando-da-ia',
    title: 'No Comando da IA',
  })
  const plan = buildAdultJourneySeed([...fullCatalog, standalone])
  const required = plan.policy.stages.flatMap((stage) => stage.requirements.map((r) => r.courseId))
  expect(required).not.toContain(standalone.id)
  expect(plan.policy.stages[1]?.requirements).toHaveLength(2)
  expect(plan.excluded).toEqual([{ slug: 'no-comando-da-ia', title: 'No Comando da IA' }])
  // O produto retirado não vira requisito; a etapa aguarda um curso da jornada.
  const onlyStandalone = buildAdultJourneySeed([course('primeiros-passos', '2d'), standalone])
  expect(onlyStandalone.policy.stages).toHaveLength(7)
  expect(onlyStandalone.policy.stages[1]?.requirements).toEqual([])
  expect(buildAdultJourneySeed(fullCatalog).excluded).toEqual([])
})

function seedOnceHarness(catalog: readonly SeedCourse[]) {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const repository = new InMemoryAdultJourneyRepository({ events: [] })
  const service = new AdultJourneyService(
    repository,
    {
      findCourseById: async (id: string) => (byId.get(id) as unknown as Course | undefined) ?? null,
      findCoursesByIds: async (ids: string[]) =>
        ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as unknown as Course] : [])),
    },
    () => new Date('2026-10-20T12:00:00Z'),
  )
  const logs: { level: string; event: string; context?: Record<string, unknown> }[] = []
  const run = () =>
    runAdultJourneySeedOnce({
      service,
      listCourses: async () => catalog,
      listShowcaseCourseIds: async () => [],
      logger: {
        info: (event, context) => logs.push({ level: 'info', event, context }),
        warn: (event, context) => logs.push({ level: 'warn', event, context }),
      },
    })
  return { repository, service, logs, run }
}

test('seed automático: grava quando não há política e vira no-op depois', async () => {
  const standalone = course('iniciante', '2d', { slug: 'no-comando-da-ia' })
  const h = seedOnceHarness([...fullCatalog, standalone])
  expect(await h.run()).toEqual({ status: 'applied', version: 1, stages: 7, pendingStages: 0 })
  expect(h.repository.record?.policy.stages).toHaveLength(7)
  expect(JSON.stringify(h.repository.record)).not.toContain(standalone.id)
  expect(h.logs.at(-1)?.event).toBe('adult_journey_seed.applied')
  expect(await h.run()).toEqual({ status: 'skipped', reason: 'already-configured' })
  expect(h.logs.at(-1)?.context?.detail).toBe('política já configurada, seed ignorado')
  expect(h.repository.record?.version).toBe(1)
})

test('seed automático: política do Admin fica byte a byte igual', async () => {
  const h = seedOnceHarness(fullCatalog)
  const admin = {
    schemaVersion: 1 as const,
    stages: [
      {
        id: 'so-um',
        title: 'Só um',
        requirements: [{ courseId: at(3).id, milestone: 'showcase' as const }],
        capabilities: ['studio' as const],
      },
    ],
  }
  await h.service.configure(admin, 0)
  await h.service.configure(admin, 1)
  const before = JSON.stringify(h.repository.record)
  expect(await h.run()).toEqual({ status: 'skipped', reason: 'already-configured' })
  expect(JSON.stringify(h.repository.record)).toBe(before)
})

test('seed automático: sem cursos cadastra as sete etapas, todas bloqueadas', async () => {
  const h = seedOnceHarness([])
  expect(await h.run()).toEqual({ status: 'applied', version: 1, stages: 7, pendingStages: 7 })
  const view = await h.service.get(randomUUID())
  expect(view.stages).toHaveLength(7)
  expect(view.stages.every((stage) => !stage.completed && !stage.available)).toBe(true)
  expect(view.capabilities).toEqual([])
  expect(await h.run()).toEqual({ status: 'skipped', reason: 'already-configured' })
})

test('seed automático: conserva as sete etapas e só concede ferramentas das etapas realmente concluídas', async () => {
  const h = seedOnceHarness([course('primeiros-passos', '2d'), course('iniciante', '2d')])
  expect(await h.run()).toEqual({ status: 'applied', version: 1, stages: 7, pendingStages: 5 })
  const policy = h.repository.record?.policy
  expect(policy?.stages).toHaveLength(7)
  expect(policy?.stages.filter((stage) => stage.requirements.length === 0)).toHaveLength(5)
  // Sem nada concluído, nenhuma ferramenta; mesmo concluindo tudo, só as das etapas gravadas.
  expect(projectAdultJourney(policy!, 1, []).capabilities).toEqual([])
  const all = policy!.stages.flatMap((stage) =>
    stage.requirements.map((r) => ({ courseId: r.courseId, completed: true, showcased: true })),
  )
  expect(projectAdultJourney(policy!, 1, all).capabilities).toEqual(['studio', 'pinta'])
})

test('seed automático: falha de leitura nunca derruba o boot', async () => {
  const h = seedOnceHarness(fullCatalog)
  const outcome = await runAdultJourneySeedOnce({
    service: h.service,
    listCourses: async () => {
      throw new Error('banco fora')
    },
    listShowcaseCourseIds: async () => [],
    logger: { info: () => {}, warn: () => {} },
  })
  expect(outcome).toEqual({ status: 'skipped', reason: 'error' })
})

test('argumentos do journey:seed-adult: --once com --milestone é erro explícito', () => {
  expect(parseAdultJourneySeedArgs([])).toEqual({
    once: false,
    apply: false,
    force: false,
    allowPartial: false,
    milestone: 'auto',
  })
  expect(parseAdultJourneySeedArgs(['--apply', '--milestone=complete']).milestone).toBe('complete')
  expect(parseAdultJourneySeedArgs(['--milestone', 'showcase']).milestone).toBe('showcase')
  expect(parseAdultJourneySeedArgs(['--once', '--force']).once).toBe(true)
  expect(() => parseAdultJourneySeedArgs(['--milestone='])).toThrow('--milestone=auto')
  expect(() => parseAdultJourneySeedArgs(['--milestone', 'mural'])).toThrow('--milestone=auto')
  for (const args of [
    ['--once', '--milestone=complete'],
    ['--once', '--milestone', 'showcase'],
    ['--milestone=auto', '--once'],
  ])
    expect(() => parseAdultJourneySeedArgs(args)).toThrow('--once não aceita --milestone')
})

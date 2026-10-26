import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../qa/creator-journey-fixtures'
import { CourseCurriculumContext } from '../src/components/course-curriculum-context'
import {
  CreatorJourneyMap,
  CreatorJourneySummary,
  CreatorMasteryArea,
  CreatorPost,
} from '../src/components/creator-journey'

test('a single base does not advertise mission, powers or extras as open', () => {
  const { view, catalog } = creatorSceneFixture('kids', 'one')
  const stage = view.stages[0]!
  const html = renderToStaticMarkup(<CreatorPost stage={stage} catalog={catalog} skin="kids" />)
  const mission = catalog.find((course) => course.courseId === stage.mission.courseId)!
  expect(html).not.toContain(`href="/cursos/${mission.courseSlug}"`)
  expect(html).toContain('Concluir as duas bases abre a missão')
  expect(html).toContain('publicação no Mural são opcionais')
})

test('direct-purchase course can be opened while its post pair is incomplete', () => {
  const { view, catalog } = creatorSceneFixture('adult', 'direct')
  const extra = catalog.find((course) => course.accessReason === 'direct-purchase')!
  const html = renderToStaticMarkup(
    <CreatorPost stage={view.stages[0]!} catalog={catalog} skin="adult" />,
  )
  expect(html).toContain(`href="/cursos/${extra.courseSlug}"`)
  const context = renderToStaticMarkup(
    <CourseCurriculumContext
      placement={extra.curriculum}
      accessReason={extra.accessReason}
      skin="adult"
    />,
  )
  expect(context).toContain('Seu curso avulso está liberado')
})

test('draft content keeps its real title and has no course CTA', () => {
  const { view, catalog } = creatorSceneFixture('adult', 'planned')
  const html = renderToStaticMarkup(
    <CreatorPost stage={view.stages[0]!} catalog={catalog} skin="adult" />,
  )
  expect(html).toContain(view.stages[0]!.base2d.title!)
  expect(html).toContain('Curso em preparação')
  expect(html).not.toContain('Abrir curso')
})

test('map states earned posts and a distinct mastery horizon without demanding extras', () => {
  const { view } = creatorSceneFixture('kids', 'retained')
  const html = renderToStaticMarkup(<CreatorJourneyMap view={view} skin="kids" />)
  expect(html).toContain('aria-current="step"')
  expect(html).toContain('href="/maestrias"')
  expect(html).toContain('Concluído')
  expect(html).toContain('2 bases + missão + 2 poderes')
})

test('mastery shows its actual entry, review rubric and language-independent levels', () => {
  const { view, catalog } = creatorSceneFixture('adult', 'fresh')
  const area = view.masteries.find((item) => item.id === 'python2d')!
  const html = renderToStaticMarkup(
    <CreatorMasteryArea area={area} catalog={catalog} skin="adult" />,
  )
  expect(html).toContain('Esta área abre depois das duas bases de')
  expect(html).not.toContain('Abre ao cumprir os requisitos do posto.')
  expect(html).toContain('duas oficinas distintas entre três')
  expect(html).toContain(area.levels[0]!.rubric.criteria[0]!.title)
  expect(html).toContain('Nenhuma outra linguagem ou dimensão')
})

test('art mastery explains integration into a working game, not editor conversion', () => {
  const { view, catalog } = creatorSceneFixture('kids', 'mastery')
  const area = view.masteries.find((item) => item.id === 'arte2d')!
  const html = renderToStaticMarkup(
    <CreatorMasteryArea area={area} catalog={catalog} skin="kids" />,
  )
  expect(html).toContain('O jogo base já funciona')
  expect(html).not.toContain('Trocar de editor')
})

test('next-step action uses the available base and never bypasses the course access fact', () => {
  const { view, catalog } = creatorSceneFixture('adult', 'one')
  const base3d = catalog.find((course) => course.courseId === view.stages[0]!.base3d.courseId)!
  const html = renderToStaticMarkup(
    <CreatorJourneySummary view={view} catalog={catalog} skin="adult" />,
  )
  expect(html).toContain(`href="/cursos/${base3d.courseSlug}"`)
  expect(html).toContain('Começar este curso')
  const withoutAccess = catalog.map((course) => ({ ...course, hasAccess: false }))
  const locked = renderToStaticMarkup(
    <CreatorJourneySummary view={view} catalog={withoutAccess} skin="adult" />,
  )
  expect(locked).not.toContain(`href="/cursos/${base3d.courseSlug}"`)
  expect(locked).toContain('Ver meu posto')
})

test('reviewed nucleus credit does not invent completion of individual lessons', () => {
  const { view, catalog } = creatorSceneFixture('kids', 'mastery')
  const area = view.masteries[0]!
  const credited = {
    ...area,
    levels: area.levels.map((level) => ({ ...level, nucleusCompleted: true })),
  }
  const html = renderToStaticMarkup(
    <CreatorMasteryArea area={credited} catalog={catalog} skin="kids" />,
  )
  expect(html).toContain('Núcleo concluído ou validado')
  expect(html).toContain('Abrir curso')
  expect(html).not.toContain('Revisar curso')
})

test('paused curriculum explains preservation without promising a promotion', () => {
  const { view, catalog } = creatorSceneFixture('kids', 'pair')
  const html = renderToStaticMarkup(
    <CreatorJourneySummary view={{ ...view, paused: true }} catalog={catalog} skin="kids" />,
  )
  expect(html).toContain('A progressão está pausada')
  expect(html).not.toContain('Para avançar:')
})

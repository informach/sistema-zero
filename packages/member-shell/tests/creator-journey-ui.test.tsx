import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../qa/creator-journey-fixtures'
import { CourseCurriculumContext } from '../src/components/course-curriculum-context'
import {
  creatorEntryCard,
  creatorEntryNote,
  creatorJourneyHint,
  creatorMasteryApproach,
  creatorMasteryEntryNote,
  creatorMasteryProgress,
  creatorNextStep,
  creatorStageChecklist,
  creatorStageMissing,
  creatorStageOpen,
} from '../src/lib/creator-journey-presentation'

/*
 * As telas da jornada moram em cada app (Kids e Estúdio à noite). Aqui fica a régua que as duas
 * leem: o estado de cada curso, o próximo passo, o que falta e as frases. Os testes de tela estão
 * em `community-kids/tests/creator-journey-screens.test.tsx` e
 * `community/tests/creator-journey-screens.test.tsx`.
 */

test('a single trail course does not open the mission, powers or extras', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'one')
  const stage = view.stages[0]!
  const mission = creatorEntryCard(stage.mission, catalog, mine)
  expect(mission.href).toBeNull()
  expect(mission.status).toBe('locked')
  expect(creatorEntryNote(mission.status, { role: 'after-pair' })).toBe(
    'Abre depois dos cursos da trilha',
  )
  expect(creatorJourneyHint(view)).toBe(
    'Conclua os cursos 2D e 3D da trilha para abrir a missão, os Poderes e os extras.',
  )
})

test('a direct purchase opens its course while the trail is incomplete', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'direct')
  const extra = catalog.find((course) => course.accessReason === 'direct-purchase')!
  const entry = view.stages[0]!.extras.find((item) => item.courseId === extra.courseId)!
  expect(creatorEntryCard(entry, catalog, mine).href).toBe(`/cursos/${extra.courseSlug}`)
  const context = renderToStaticMarkup(
    <CourseCurriculumContext
      placement={extra.curriculum}
      accessReason={extra.accessReason}
      skin="adult"
    />,
  )
  expect(context).toContain('Seu curso avulso está liberado')
  expect(context).toContain('sz-chip')
})

test('draft content keeps its real title and has no course link', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'planned')
  const card = creatorEntryCard(view.stages[0]!.base2d, catalog, mine)
  expect(card.title).toBe(view.stages[0]!.base2d.title!)
  expect(card.status).toBe('planned')
  expect(card.href).toBeNull()
  expect(creatorEntryNote(card.status)).toBe('Curso em preparação')
})

test('the checklist counts the trail courses, the mission and the required powers', () => {
  const { view } = creatorSceneFixture('kids', 'mission')
  const stage = view.stages[0]!
  const list = creatorStageChecklist(stage)
  expect(list.courses.complete).toBe(true)
  expect(list.mission.complete).toBe(true)
  expect(list.powers.required).toBe(stage.minimumPowers)
  expect(list.complete).toBe(false)
  expect(creatorStageMissing(stage)).toBe(
    `Falta ${stage.minimumPowers} ${stage.minimumPowers === 1 ? 'Poder' : 'Poderes'}`,
  )
})

test('the next step uses the open trail course and never bypasses course access', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'one')
  const base3d = catalog.find((course) => course.courseId === view.stages[0]!.base3d.courseId)!
  const next = creatorNextStep(view, catalog, mine)
  expect(next?.role).toBe('base3d')
  expect(next?.card.continueHref).toBe(`/cursos/${base3d.courseSlug}`)
  const withoutAccess = catalog.map((course) => ({ ...course, hasAccess: false }))
  expect(creatorNextStep(view, withoutAccess, [])).toBeNull()
})

test('mastery shows its actual entry and the language-independent approach', () => {
  const { view } = creatorSceneFixture('adult', 'fresh')
  const area = view.masteries.find((item) => item.id === 'python2d')!
  expect(creatorMasteryEntryNote(area, view)).toContain('Abre depois dos cursos da trilha')
  expect(creatorMasteryProgress(area).status).toBe('locked')
  const art = view.masteries.find((item) => item.id === 'arte2d')!
  expect(creatorMasteryApproach(art)).toContain('O jogo base já funciona')
  expect(creatorMasteryApproach(art)).not.toContain('Trocar de editor')
})

test('a reviewed nucleus credit does not invent completion of its courses', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'mastery')
  const level = view.masteries[0]!.levels[0]!
  const credited = { ...level, nucleusCompleted: true }
  expect(credited.nucleusCourses.length).toBeGreaterThan(0)
  for (const entry of credited.nucleusCourses)
    expect(creatorEntryCard(entry, catalog, mine).status).not.toBe('done')
})

test('a paused curriculum explains preservation without promising a promotion', () => {
  const { view } = creatorSceneFixture('kids', 'pair')
  const hint = creatorJourneyHint({ ...view, paused: true })
  expect(hint).toContain('A progressão está pausada')
  expect(hint).not.toContain('Para avançar:')
})

test('a post opens only when reached, or when the server already opened one of its courses', () => {
  const { view } = creatorSceneFixture('kids', 'coder')
  expect(view.stages.map(creatorStageOpen)).toEqual([true, true, false, false, false, false, false])
  const direct = creatorSceneFixture('kids', 'direct').view
  const future = {
    ...direct.stages[2]!,
    extras: [{ ...direct.stages[2]!.extras[0]!, state: 'available' as const }],
  }
  expect(creatorStageOpen(direct.stages[2]!)).toBe(false)
  expect(creatorStageOpen(future)).toBe(true)
})

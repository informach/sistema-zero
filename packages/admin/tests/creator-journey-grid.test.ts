import { expect, test } from 'bun:test'
import {
  creatorCourseId,
  creatorCurriculumFixture,
} from '../../core/tests/fixtures/creator-curriculum'
import { creatorJourneyEditorHref, creatorJourneyGrid } from '../src/lib/creator-journey-grid'
import type { CourseView } from '../src/lib/types'

const course = (id: string, status = 'published', patch: Partial<CourseView> = {}) =>
  ({ id, title: `Curso ${id.slice(-3)}`, status, track: '2d', ...patch }) as CourseView

function catalogFor(curriculum = creatorCurriculumFixture()) {
  return curriculum.stages.flatMap((stage) => [
    course(stage.base2dCourseId),
    course(stage.base3dCourseId, 'published', { track: '3d' }),
    course(stage.missionCourseId),
    ...stage.powers.flatMap((power) => power.courseIds.map((id) => course(id))),
    ...stage.extras.map((extra) => course(extra.courseId)),
  ])
}

test('a fully published curriculum is ready in every post', () => {
  const grid = creatorJourneyGrid(creatorCurriculumFixture(), catalogFor())
  expect(grid.total).toBe(7)
  expect(grid.ready).toBe(7)
  expect(grid.stages.every((stage) => stage.warnings.length === 0)).toBe(true)
  expect(grid.stages[0]!.position).toBe(1)
})

test('a power counts once even with two published versions, and one version is enough', () => {
  const curriculum = creatorCurriculumFixture()
  const first = curriculum.stages[1]!
  // Só a versão 3D do Relógio publicada; Contador e Inventário em rascunho.
  const catalog = catalogFor().map((item) =>
    item.id === first.powers[0]!.courseIds[0] ||
    item.id === first.powers[1]!.courseIds[0] ||
    item.id === first.powers[2]!.courseIds[0]
      ? { ...item, status: 'draft' }
      : item,
  )
  const stage = creatorJourneyGrid(curriculum, catalog).stages[1]!
  expect(stage.powers[0]!.published).toBe(true)
  expect(stage.publishedPowers).toBe(1)
  expect(stage.ready).toBe(false)
  expect(stage.warnings[0]).toBe(
    'Só 1 Poder publicado e 2 exigidos: ninguém consegue subir deste posto.',
  )
})

test('drafts, archived and missing links are named, never counted as ready', () => {
  const curriculum = creatorCurriculumFixture()
  const stage = curriculum.stages[0]!
  const catalog = catalogFor()
    .filter((item) => item.id !== stage.base3dCourseId)
    .map((item) =>
      item.id === stage.missionCourseId
        ? { ...item, status: 'draft' }
        : item.id === stage.base2dCourseId
          ? { ...item, status: 'archived' }
          : item,
    )
  const view = creatorJourneyGrid(curriculum, catalog).stages[0]!
  expect(view.base2d.state).toBe('archived')
  expect(view.base3d.state).toBe('missing')
  expect(view.base3d.course).toBeNull()
  expect(view.mission.state).toBe('draft')
  expect(view.ready).toBe(false)
  expect(view.warnings).toContain(
    '1 vínculo aponta para um curso que não está na lista: confira no editor da jornada.',
  )
})

test('no published power at all is written plainly', () => {
  const curriculum = creatorCurriculumFixture()
  const powerIds = new Set(curriculum.stages[0]!.powers.flatMap((power) => power.courseIds))
  const view = creatorJourneyGrid(
    curriculum,
    catalogFor().filter((item) => !powerIds.has(item.id)),
  ).stages[0]!
  expect(view.warnings[0]).toBe(
    'Nenhum Poder publicado e 1 exigido: ninguém consegue subir deste posto.',
  )
})

test('an extra keeps the policy title when its course is missing', () => {
  const curriculum = creatorCurriculumFixture()
  const extraId = curriculum.stages[0]!.extras[0]!.courseId
  const view = creatorJourneyGrid(
    curriculum,
    catalogFor().filter((item) => item.id !== extraId),
  ).stages[0]!
  expect(view.extras[0]!.title).toBe('Extra')
  expect(view.extras[0]!.state).toBe('missing')
  // Extras não contam para subir: o posto continua pronto.
  expect(view.ready).toBe(true)
})

test('the editor link follows the lens and opens the post', () => {
  expect(creatorJourneyEditorHref('kids')).toBe('/admin/professor/jornada-kids')
  expect(creatorJourneyEditorHref('adult', 'coder')).toBe(
    '/admin/professor/jornada-adulta?posto=coder',
  )
  expect(creatorCourseId(1)).toMatch(/^10000000/)
})

test('an unpublished trail course or mission says why the post is not ready', () => {
  const curriculum = creatorCurriculumFixture()
  const stage = curriculum.stages[2]!
  const view = creatorJourneyGrid(
    curriculum,
    catalogFor().map((item) =>
      item.id === stage.missionCourseId || item.id === stage.base3dCourseId
        ? { ...item, status: 'draft' }
        : item,
    ),
  ).stages[2]!
  expect(view.ready).toBe(false)
  expect(view.warnings[0]).toBe(
    'Falta publicar o curso 3D da trilha e a missão: ninguém consegue subir deste posto.',
  )
})

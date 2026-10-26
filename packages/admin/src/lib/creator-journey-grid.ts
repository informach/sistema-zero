import type { CreatorJourneyCurriculum } from '@sistemazero/core/journey'
import type { CourseView } from './types'

/**
 * A grade da Jornada do Criador em Cursos (a sala da equipe, 26/10/2026): um cartão por posto com
 * os cursos da trilha, a missão, os Poderes e os extras que a política publicada vincula, cada um
 * com a situação do curso no catálogo. Só LÊ a política e a lista de cursos: o vínculo muda no
 * editor da jornada. Pura, para a tela e os testes lerem a mesma régua.
 */

export type CreatorGridCourseState = 'published' | 'draft' | 'archived' | 'missing'

export interface CreatorGridCourse {
  courseId: string
  /** O curso da lista; `null` quando o vínculo aponta para um curso que não está nela. */
  course: CourseView | null
  title: string
  state: CreatorGridCourseState
}

export interface CreatorGridPower {
  mechanicId: string
  title: string
  courses: CreatorGridCourse[]
  /** Uma versão publicada basta: as versões 2D e 3D do mesmo Poder contam uma vez. */
  published: boolean
}

export interface CreatorGridStage {
  level: string
  title: string
  position: number
  base2d: CreatorGridCourse
  base3d: CreatorGridCourse
  mission: CreatorGridCourse
  powers: CreatorGridPower[]
  minimumPowers: number
  publishedPowers: number
  extras: CreatorGridCourse[]
  /** O que impede alguém de subir deste posto, escrito para a equipe. */
  warnings: string[]
  ready: boolean
}

export interface CreatorGridView {
  stages: CreatorGridStage[]
  ready: number
  total: number
}

export const CREATOR_GRID_STATE_LABEL: Record<CreatorGridCourseState, string> = {
  published: 'Publicado',
  draft: 'Falta publicar',
  archived: 'Arquivado',
  missing: 'Vínculo indisponível',
}

function gridCourse(
  courseId: string,
  byId: ReadonlyMap<string, CourseView>,
  fallbackTitle?: string,
): CreatorGridCourse {
  const course = byId.get(courseId) ?? null
  return {
    courseId,
    course,
    title: course?.title ?? fallbackTitle ?? 'Curso não encontrado',
    state: !course
      ? 'missing'
      : course.status === 'published'
        ? 'published'
        : course.status === 'archived'
          ? 'archived'
          : 'draft',
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function creatorJourneyGrid(
  curriculum: CreatorJourneyCurriculum,
  courses: readonly CourseView[],
): CreatorGridView {
  const byId = new Map(courses.map((course) => [course.id, course]))
  const stages = curriculum.stages.map((stage, index): CreatorGridStage => {
    const base2d = gridCourse(stage.base2dCourseId, byId)
    const base3d = gridCourse(stage.base3dCourseId, byId)
    const mission = gridCourse(stage.missionCourseId, byId)
    const powers = stage.powers.map((power) => {
      const options = power.courseIds.map((id) => gridCourse(id, byId))
      return {
        mechanicId: power.mechanicId,
        title: power.title,
        courses: options,
        published: options.some((option) => option.state === 'published'),
      }
    })
    const extras = stage.extras.map((extra) => gridCourse(extra.courseId, byId, extra.title))
    const publishedPowers = powers.filter((power) => power.published).length
    const fixed = [base2d, base3d, mission]
    const warnings: string[] = []
    if (publishedPowers < stage.minimumPowers)
      warnings.push(
        `${publishedPowers === 0 ? 'Nenhum Poder publicado' : `Só ${plural(publishedPowers, 'Poder publicado', 'Poderes publicados')}`} e ${plural(stage.minimumPowers, 'exigido', 'exigidos')}: ninguém consegue subir deste posto.`,
      )
    const missing = [...fixed, ...powers.flatMap((power) => power.courses), ...extras].filter(
      (item) => item.state === 'missing',
    ).length
    if (missing)
      warnings.push(
        `${plural(missing, 'vínculo aponta', 'vínculos apontam')} para um curso que não está na lista: confira no editor da jornada.`,
      )
    return {
      level: stage.level,
      title: stage.title,
      position: index + 1,
      base2d,
      base3d,
      mission,
      powers,
      minimumPowers: stage.minimumPowers,
      publishedPowers,
      extras,
      warnings,
      ready:
        fixed.every((item) => item.state === 'published') && publishedPowers >= stage.minimumPowers,
    }
  })
  return {
    stages,
    ready: stages.filter((stage) => stage.ready).length,
    total: stages.length,
  }
}

/** O editor da jornada já aberto no posto (ou na Maestria) pedido. */
export function creatorJourneyEditorHref(audience: string, target?: string): string {
  const base = `/admin/professor/jornada-${audience === 'adult' ? 'adulta' : 'kids'}`
  return target ? `${base}?posto=${encodeURIComponent(target)}` : base
}

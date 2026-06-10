import type { LessonBlockContent, LessonBlockKind } from './lesson-block'

/**
 * Tipos do conteúdo do curso (árvore Course → Module → Lesson → Block/Attachment).
 * Na Fatia 1 o conteúdo é só LEITURA (entra por seed); a autoria (CRUD admin) é
 * fatia seguinte. Por isso são tipos de leitura, não agregados com invariantes.
 */
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const
export type CourseStatus = (typeof COURSE_STATUSES)[number]

/**
 * Audiência do curso: a qual PLATAFORMA o curso pertence (`adult` = community,
 * `kids` = community-kids). Governa a vitrine (listagens filtram por audiência)
 * E a chave-mestra: `all_courses` cobre só cursos `adult` — curso kids exige
 * matrícula específica. Equipe interna (chave-mestra VIRTUAL) vê as duas.
 */
export const COURSE_AUDIENCES = ['adult', 'kids'] as const
export type CourseAudience = (typeof COURSE_AUDIENCES)[number]

/**
 * Status que concedem acesso a quem já tem matrícula: `published` (à venda) ou
 * `archived` (retirado da venda, mas quem comprou mantém o acesso — padrão LMS).
 * `draft` nunca concede acesso. Descoberta/venda usa só `published`; consumo usa isto.
 */
export const ACCESSIBLE_COURSE_STATUSES = ['published', 'archived'] as const

export function isCourseAccessible(status: CourseStatus): boolean {
  return (ACCESSIBLE_COURSE_STATUSES as readonly CourseStatus[]).includes(status)
}

export interface Course {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  status: CourseStatus
  audience: CourseAudience
  /** Extras livres (ex.: `salesPageUrl` — URL da página de vendas no funil). */
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface Module {
  id: string
  courseId: string
  title: string
  summary: string | null
  sortOrder: number
}

export interface Lesson {
  id: string
  moduleId: string
  courseId: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
  /** Aula rascunho (`false`) é invisível ao aluno; só o admin a vê/edita. */
  isPublished: boolean
}

export interface LessonBlock {
  id: string
  lessonId: string
  kind: LessonBlockKind
  sortOrder: number
  content: LessonBlockContent
}

export interface LessonAttachment {
  id: string
  lessonId: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

/** Módulo com suas aulas (resumidas, sem o conteúdo dos blocos) — detalhe do curso. */
export interface ModuleWithLessons extends Module {
  lessons: Lesson[]
}

/** Aula com o conteúdo completo (blocos ordenados + anexos) — usada no detalhe da aula. */
export interface LessonWithContent extends Lesson {
  blocks: LessonBlock[]
  attachments: LessonAttachment[]
}

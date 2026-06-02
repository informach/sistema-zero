import type { LessonBlockContent, LessonBlockKind } from './lesson-block'

/**
 * Tipos do conteúdo do curso (árvore Course → Module → Lesson → Block/Attachment).
 * Na Fatia 1 o conteúdo é só LEITURA (entra por seed); a autoria (CRUD admin) é
 * fatia seguinte. Por isso são tipos de leitura, não agregados com invariantes.
 */
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const
export type CourseStatus = (typeof COURSE_STATUSES)[number]

export interface Course {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  status: CourseStatus
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

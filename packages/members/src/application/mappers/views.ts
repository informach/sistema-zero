import type { Course, LessonWithContent, ModuleWithLessons } from '../../domain/course/course'
import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { CourseProgress } from '../../domain/progress/progress'

/** Acesso do aluno àquele curso (snapshot da matrícula ativa). */
export interface AccessView {
  accessType: string
  /** ISO-8601 ou `null` (vitalício / assinatura ativa sem validade calculada). */
  expiresAt: string | null
}

export function toAccessView(e: EntitlementAggregate): AccessView {
  return { accessType: e.accessType, expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null }
}

export interface CourseProgressView extends CourseProgress {
  lastCompletedAt: string | null
}

export function toCourseProgressView(
  progress: CourseProgress,
  lastCompletedAt: Date | null,
): CourseProgressView {
  return { ...progress, lastCompletedAt: lastCompletedAt ? lastCompletedAt.toISOString() : null }
}

export interface MyCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgress
  /** Última aula acessada (posição de vídeo) — atalho do card; `null` se nunca acessou. */
  continueLessonId: string | null
}

export function toMyCourseView(
  course: Course,
  entitlement: EntitlementAggregate,
  progress: CourseProgress,
  continueLessonId: string | null,
): MyCourseView {
  return {
    courseSlug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    coverImageUrl: course.coverImageUrl,
    access: toAccessView(entitlement),
    progress,
    continueLessonId,
  }
}

export interface LessonOutlineView {
  id: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
  completed: boolean
}

export interface ModuleOutlineView {
  id: string
  title: string
  summary: string | null
  sortOrder: number
  lessons: LessonOutlineView[]
}

export interface CourseDetailView {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgressView
  /** Aula-alvo do CTA "Continuar de onde parou" (ver `resolveContinueLesson`). */
  continueLessonId: string | null
  modules: ModuleOutlineView[]
}

export function toCourseDetailView(
  course: Course,
  modules: ModuleWithLessons[],
  completedLessonIds: Set<string>,
  entitlement: EntitlementAggregate,
  progress: CourseProgressView,
  continueLessonId: string | null,
): CourseDetailView {
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    coverImageUrl: course.coverImageUrl,
    access: toAccessView(entitlement),
    progress,
    continueLessonId,
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      sortOrder: m.sortOrder,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        sortOrder: l.sortOrder,
        estimatedMinutes: l.estimatedMinutes,
        completed: completedLessonIds.has(l.id),
      })),
    })),
  }
}

export interface LessonBlockView {
  id: string
  kind: string
  sortOrder: number
  content: unknown
}

export interface LessonAttachmentView {
  id: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

export interface LessonDetailView {
  id: string
  slug: string
  title: string
  moduleId: string
  courseSlug: string
  estimatedMinutes: number | null
  completed: boolean
  /** Posição de reprodução salva (segundos) — `null` se nunca assistiu. */
  positionSeconds: number | null
  blocks: LessonBlockView[]
  attachments: LessonAttachmentView[]
}

export function toLessonDetailView(
  lesson: LessonWithContent,
  courseSlug: string,
  completed: boolean,
  positionSeconds: number | null,
): LessonDetailView {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    moduleId: lesson.moduleId,
    courseSlug,
    estimatedMinutes: lesson.estimatedMinutes,
    completed,
    positionSeconds,
    blocks: lesson.blocks.map((b) => ({
      id: b.id,
      kind: b.kind,
      sortOrder: b.sortOrder,
      content: b.content,
    })),
    attachments: lesson.attachments.map((a) => ({
      id: a.id,
      label: a.label,
      url: a.url,
      fileType: a.fileType,
      sizeBytes: a.sizeBytes,
      sortOrder: a.sortOrder,
    })),
  }
}

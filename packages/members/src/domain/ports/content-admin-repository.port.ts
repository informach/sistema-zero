import type {
  Course,
  CourseStatus,
  Lesson,
  LessonAttachment,
  LessonBlock,
  Module,
} from '../course/course'
import type { LessonBlockContent, LessonBlockKind } from '../course/lesson-block'

// ── Inputs de autoria ───────────────────────────────────────────────────────

export interface CourseFields {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  /** Página de vendas (funil) — persiste em `metadata.salesPageUrl` (jsonb). */
  salesPageUrl: string | null
  status: CourseStatus
}

export interface ModuleFields {
  title: string
  summary: string | null
}

export interface LessonFields {
  slug: string
  title: string
  estimatedMinutes: number | null
  isPublished: boolean
}

export interface AttachmentFields {
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
}

export interface ListCoursesAdminFilter {
  q?: string
  status?: CourseStatus
  limit: number
  offset: number
}

/**
 * Persistência de AUTORIA (CRUD de cursos/módulos/aulas/blocos/anexos) — separada
 * do `CourseRepository` (leitura do aluno). Slug duplicado (índice único) → lança
 * `DuplicateSlugError`. Ordenação reescrita por índice em transação. `delete*` conta
 * com `onDelete: cascade` no schema; cursos/aulas também podam `lesson_completions`.
 */
export interface ContentAdminRepository {
  // ── Cursos ──
  listCoursesAdmin(filter: ListCoursesAdminFilter): Promise<{ items: Course[]; total: number }>
  createCourse(fields: CourseFields): Promise<Course>
  /** `UPDATE ... WHERE id = ? AND version = ?` → `false` se conflito. 23505 → DuplicateSlugError. */
  updateCourse(course: Course): Promise<boolean>
  deleteCourse(id: string): Promise<boolean>
  /** Aulas publicadas do curso (guard: publicar curso exige ≥1 aula publicada). */
  countPublishedLessons(courseId: string): Promise<number>

  // ── Módulos ──
  findModuleById(id: string): Promise<Module | null>
  createModule(courseId: string, fields: ModuleFields): Promise<Module>
  updateModule(id: string, fields: ModuleFields): Promise<Module | null>
  deleteModule(id: string): Promise<boolean>
  listModuleIds(courseId: string): Promise<string[]>
  reorderModules(courseId: string, orderedIds: string[]): Promise<void>

  // ── Aulas ──
  findLessonById(id: string): Promise<Lesson | null>
  createLesson(moduleId: string, courseId: string, fields: LessonFields): Promise<Lesson>
  updateLesson(id: string, fields: LessonFields): Promise<Lesson | null>
  deleteLesson(id: string): Promise<boolean>
  listLessonIds(moduleId: string): Promise<string[]>
  reorderLessons(moduleId: string, orderedIds: string[]): Promise<void>

  // ── Blocos ──
  createBlock(
    lessonId: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock>
  updateBlock(
    id: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock | null>
  deleteBlock(id: string): Promise<boolean>
  listBlockIds(lessonId: string): Promise<string[]>
  reorderBlocks(lessonId: string, orderedIds: string[]): Promise<void>

  // ── Anexos ──
  createAttachment(lessonId: string, fields: AttachmentFields): Promise<LessonAttachment>
  updateAttachment(id: string, fields: AttachmentFields): Promise<LessonAttachment | null>
  deleteAttachment(id: string): Promise<boolean>
  listAttachmentIds(lessonId: string): Promise<string[]>
  reorderAttachments(lessonId: string, orderedIds: string[]): Promise<void>
}

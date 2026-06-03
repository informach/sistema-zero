import type {
  Course,
  Lesson,
  LessonAttachment,
  LessonBlock,
  LessonWithContent,
  Module,
  ModuleWithLessons,
} from '../../domain/course/course'

/** Views ADMIN de AUTORIA (CRUD de conteúdo). Datas → ISO. */

export interface CourseView {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function toCourseView(c: Course): CourseView {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    coverImageUrl: c.coverImageUrl,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export interface ModuleView {
  id: string
  courseId: string
  title: string
  summary: string | null
  sortOrder: number
}

export function toModuleView(m: Module): ModuleView {
  return {
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    summary: m.summary,
    sortOrder: m.sortOrder,
  }
}

export interface LessonView {
  id: string
  moduleId: string
  courseId: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
}

export function toLessonView(l: Lesson): LessonView {
  return {
    id: l.id,
    moduleId: l.moduleId,
    courseId: l.courseId,
    slug: l.slug,
    title: l.title,
    sortOrder: l.sortOrder,
    estimatedMinutes: l.estimatedMinutes,
  }
}

export interface BlockView {
  id: string
  lessonId: string
  kind: string
  sortOrder: number
  content: unknown
}

export function toBlockView(b: LessonBlock): BlockView {
  return {
    id: b.id,
    lessonId: b.lessonId,
    kind: b.kind,
    sortOrder: b.sortOrder,
    content: b.content,
  }
}

export interface AttachmentView {
  id: string
  lessonId: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

export function toAttachmentView(a: LessonAttachment): AttachmentView {
  return {
    id: a.id,
    lessonId: a.lessonId,
    label: a.label,
    url: a.url,
    fileType: a.fileType,
    sizeBytes: a.sizeBytes,
    sortOrder: a.sortOrder,
  }
}

/** Árvore do curso p/ o editor: curso + módulos (ordenados) + aulas (resumidas). */
export interface CourseTreeView extends CourseView {
  modules: (ModuleView & { lessons: LessonView[] })[]
}

export function toCourseTreeView(course: Course, outline: ModuleWithLessons[]): CourseTreeView {
  return {
    ...toCourseView(course),
    modules: outline.map((m) => ({ ...toModuleView(m), lessons: m.lessons.map(toLessonView) })),
  }
}

/** Conteúdo completo da aula p/ o editor: blocos (ordenados) + anexos. */
export interface LessonContentView extends LessonView {
  blocks: BlockView[]
  attachments: AttachmentView[]
}

export function toLessonContentView(lesson: LessonWithContent): LessonContentView {
  return {
    ...toLessonView(lesson),
    blocks: lesson.blocks.map(toBlockView),
    attachments: lesson.attachments.map(toAttachmentView),
  }
}

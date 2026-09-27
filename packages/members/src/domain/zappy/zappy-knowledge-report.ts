interface PublishedLessonView {
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
}

interface PublishedLessonBlockView {
  blockId: string
  lessonId: string
  content: { kind: string }
}

interface PublishedCourseView {
  courseId: string
  courseTitle: string
}

interface PublishedNotebookAttachmentView {
  courseId: string
  zappyStudentNotebook: boolean
}

/** Presença editorial do caderno é independente do sucesso da extração do PDF. */
export function coursesMissingStudentNotebook<TCourse extends PublishedCourseView>(
  courses: readonly TCourse[],
  attachments: readonly PublishedNotebookAttachmentView[],
): TCourse[] {
  const withNotebook = new Set(
    attachments
      .filter((attachment) => attachment.zappyStudentNotebook)
      .map((attachment) => attachment.courseId),
  )
  return courses.filter((course) => !withNotebook.has(course.courseId))
}

/** Uma aula fica pendente quando qualquer um de seus vídeos não tem fonte VTT pronta. */
export function lessonsMissingVideoTranscript<TLesson extends PublishedLessonView>(
  lessons: readonly TLesson[],
  blocks: readonly PublishedLessonBlockView[],
  readyVideoSourceRefs: ReadonlySet<string>,
): TLesson[] {
  return lessons.filter((lesson) =>
    blocks.some(
      (block) =>
        block.lessonId === lesson.lessonId &&
        block.content.kind === 'video' &&
        !readyVideoSourceRefs.has(`block:${block.blockId}`),
    ),
  )
}

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

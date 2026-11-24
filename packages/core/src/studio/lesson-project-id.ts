const LESSON_STUDIO_PREFIX = 'sz-lesson-studio-'

/** Reserved lesson draft identities keep their checkpoint protocol. */
export function isLessonStudioProjectId(id: string): boolean {
  return id.startsWith(LESSON_STUDIO_PREFIX)
}

/** Stable local draft identity shared by the editor and contextual server authorization. */
export function lessonStudioProjectId(blockId: string, viewerId?: string | null): string {
  const who = viewerId ? `${viewerId}-` : ''
  return `${LESSON_STUDIO_PREFIX}${who}${blockId}`
}

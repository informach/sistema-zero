/** Stable local draft identity shared by the editor and contextual server authorization. */
export function lessonStudioProjectId(blockId: string, viewerId?: string | null): string {
  const who = viewerId ? `${viewerId}-` : ''
  return `sz-lesson-studio-${who}${blockId}`
}

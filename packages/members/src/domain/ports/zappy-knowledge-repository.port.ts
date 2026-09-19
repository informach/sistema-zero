import type { LessonBlockContent } from '../course/lesson-block'

export type ZappyKnowledgeSourceType = 'video-vtt' | 'rich-text' | 'student-notebook'
export type ZappyKnowledgeStatus = 'pending' | 'ready' | 'empty' | 'error'

export interface ZappyKnowledgeChunkInput {
  content: string
  normalizedText: string
}

export interface ZappyKnowledgeSourceInput {
  courseId: string
  lessonId: string
  blockId: string | null
  blockRevision: string
  sourceType: ZappyKnowledgeSourceType
  sourceRef: string
  contentHash: string
  status: ZappyKnowledgeStatus
  error?: string | null
  chunks: ZappyKnowledgeChunkInput[]
  now: Date
}

export interface ZappySourceAuthority {
  blockId: string | null
  courseId: string
  lessonId: string
  blockRevision: string
}

export interface ZappyKnowledgeHit {
  courseId: string
  courseSlug: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
  sourceType: ZappyKnowledgeSourceType
  content: string
}

export interface PublishedZappyBlock {
  blockId: string
  courseId: string
  lessonId: string
  blockRevision: string
  kind: string
  content: LessonBlockContent
}

export interface PublishedZappyNotebook {
  attachmentId: string
  courseId: string
  lessonId: string
  attachmentRevision: string
  url: string
}

export interface ZappyKnowledgeReport {
  publishedKidsLessons: number
  readySources: number
  errorSources: number
  pendingSources: number
  lessonsWithVideoWithoutTranscript: Array<{
    courseId: string
    courseTitle: string
    lessonId: string
    lessonTitle: string
  }>
  coursesWithoutStudentNotebook: Array<{ courseId: string; courseTitle: string }>
  failedSources: Array<{
    sourceRef: string
    sourceType: ZappyKnowledgeSourceType
    courseTitle: string
    lessonTitle: string
    error: string
  }>
}

export interface ZappyKnowledgeRepository {
  sourceAuthorityForRef(sourceRef: string): Promise<ZappySourceAuthority | null>
  /** Retorna null quando a revisão deixou de ser autoritativa antes da escrita atômica. */
  upsert(input: ZappyKnowledgeSourceInput): Promise<{ id: string; changed: boolean } | null>
  deleteByRef(sourceRef: string): Promise<void>
  search(lessonIds: string[], query: string, limit: number): Promise<ZappyKnowledgeHit[]>
  listPublishedKidsBlocks(input?: {
    after?: string
    limit?: number
  }): Promise<PublishedZappyBlock[]>
  listPublishedKidsNotebooks(input?: {
    after?: string
    limit?: number
  }): Promise<PublishedZappyNotebook[]>
  /** Remove fontes sem bloco ou arquivo publicado e autoritativo. */
  reconcilePublishedSources(): Promise<number>
  report(): Promise<ZappyKnowledgeReport>
}

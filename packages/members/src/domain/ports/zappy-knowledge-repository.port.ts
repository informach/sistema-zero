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
  blockId: string
  blockRevision: string
  sourceType: ZappyKnowledgeSourceType
  sourceRef: string
  contentHash: string
  status: ZappyKnowledgeStatus
  error?: string | null
  chunks: ZappyKnowledgeChunkInput[]
  now: Date
}

export interface ZappyBlockSourceAuthority {
  blockId: string
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
  kind: string
  content: LessonBlockContent
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
  blockAuthorityForSource(sourceRef: string): Promise<ZappyBlockSourceAuthority | null>
  upsert(input: ZappyKnowledgeSourceInput): Promise<{ id: string; changed: boolean }>
  deleteByRef(sourceRef: string): Promise<void>
  search(lessonIds: string[], query: string, limit: number): Promise<ZappyKnowledgeHit[]>
  listPublishedKidsBlocks(): Promise<PublishedZappyBlock[]>
  /** Remove fontes cujo bloco publicado/tipo autoritativo já não existe no banco. */
  reconcilePublishedBlockSources(): Promise<number>
  report(): Promise<ZappyKnowledgeReport>
}

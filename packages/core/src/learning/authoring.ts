import type { LessonSection } from './index'

export interface DraftBlockContent {
  kind: string
  [key: string]: unknown
}
export interface DraftBlock<T extends { kind: string } = DraftBlockContent> {
  id: string
  content: T
}
export interface DraftAttachment {
  id: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
}
export interface PlannedLessonVideo {
  blockId: string
  instructions: string
  videoId: string | null
}
export interface LessonDraftDocument<T extends { kind: string } = DraftBlockContent> {
  title: string
  slug: string
  estimatedMinutes: number | null
  blocks: DraftBlock<T>[]
  sections: LessonSection[]
  supportBlockIds: string[]
  attachments: DraftAttachment[]
  plannedVideos: PlannedLessonVideo[]
}
export interface LessonDraft<T extends { kind: string } = DraftBlockContent> {
  lessonId: string
  revision: string
  publishedRevision: string
  isPublished: boolean
  document: LessonDraftDocument<T>
  updatedBy: string | null
  updatedAt: string
}
/** Content travels per block; moving a tool never retransmits its project. */
export type LessonDraftChange<T extends { kind: string } = DraftBlockContent> =
  | { type: 'block'; block: DraftBlock<T>; sectionId?: string | null }
  | { type: 'remove-block'; blockId: string }
  | { type: 'structure'; sections: LessonSection[]; supportBlockIds: string[] }
  | { type: 'metadata'; title: string; slug: string; estimatedMinutes: number | null }
  | { type: 'attachments'; attachments: DraftAttachment[] }
  | { type: 'planned-videos'; plannedVideos: PlannedLessonVideo[] }

export interface LessonDraftCommand<T extends { kind: string } = DraftBlockContent> {
  expectedRevision: string
  operationId: string
  change: LessonDraftChange<T>
}
export interface LessonDraftIssue {
  blockId?: string
  sectionId?: string
  message: string
}

export function applyLessonDraftChange<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  change: LessonDraftChange<T>,
): LessonDraftDocument<T> {
  switch (change.type) {
    case 'metadata':
      return {
        ...document,
        title: change.title,
        slug: change.slug,
        estimatedMinutes: change.estimatedMinutes,
      }
    case 'attachments':
      return { ...document, attachments: change.attachments }
    case 'planned-videos':
      return { ...document, plannedVideos: change.plannedVideos }
    case 'structure':
      return { ...document, sections: change.sections, supportBlockIds: change.supportBlockIds }
    case 'remove-block':
      return {
        ...document,
        blocks: document.blocks.filter((b) => b.id !== change.blockId),
        sections: document.sections.map((s) => ({
          ...s,
          blockIds: s.blockIds.filter((id) => id !== change.blockId),
          workspaceBlockId: s.workspaceBlockId === change.blockId ? null : s.workspaceBlockId,
        })),
        supportBlockIds: document.supportBlockIds.filter((id) => id !== change.blockId),
        plannedVideos: document.plannedVideos.filter((v) => v.blockId !== change.blockId),
      }
    case 'block': {
      const existing = document.blocks.some((b) => b.id === change.block.id)
      return {
        ...document,
        plannedVideos: document.plannedVideos.filter(
          (v) => v.blockId !== change.block.id || change.block.content.kind === 'video',
        ),
        blocks: existing
          ? document.blocks.map((b) => (b.id === change.block.id ? change.block : b))
          : [...document.blocks, change.block],
        sections:
          !existing && change.sectionId
            ? document.sections.map((s) =>
                s.id === change.sectionId
                  ? { ...s, blockIds: [...s.blockIds, change.block.id] }
                  : s,
              )
            : document.sections,
        supportBlockIds:
          !existing && !change.sectionId
            ? [...document.supportBlockIds, change.block.id]
            : document.supportBlockIds,
      }
    }
  }
}

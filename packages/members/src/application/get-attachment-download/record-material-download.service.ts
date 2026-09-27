import { createHash } from 'node:crypto'
import { AttachmentNotFoundError, LessonNotFoundError } from '../../domain/course/course.errors'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LearningRepository } from '../../domain/ports/learning-repository.port'
import type { SectionProgressionService } from '../learning/section-progression.service'
import type { GetAttachmentDownloadService } from './get-attachment-download.service'

/** Chamado somente pelo BFF depois que a entrega autorizada foi preparada. */
export class RecordMaterialDownloadService {
  constructor(
    private readonly resolve: GetAttachmentDownloadService,
    private readonly courses: CourseRepository,
    private readonly learning: LearningRepository,
    private readonly sections: SectionProgressionService,
    private readonly clock: () => Date,
  ) {}

  async execute(input: {
    userId: string
    accountId: string
    courseSlug: string
    lessonId: string
    attachmentId: string
    blockId: string
    itemId: string
    expectedRevision: string
    expectedStorageRefHash: string
  }) {
    const attachment = await this.resolve.execute(
      input.userId,
      input.courseSlug,
      input.lessonId,
      input.attachmentId,
      false,
      input.accountId,
    )
    if (
      createHash('sha256').update(attachment.storageRef).digest('hex') !==
      input.expectedStorageRefHash
    )
      throw new LearningConflictError()
    const lesson = await this.courses.findLessonWithContent(input.lessonId)
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const block = lesson.blocks.find((candidate) => candidate.id === input.blockId)
    if (block?.content.kind !== 'materials') throw new AttachmentNotFoundError()
    const item = block.content.items.find((candidate) => candidate.id === input.itemId)
    if (item?.kind !== 'file' || item.attachmentId !== input.attachmentId)
      throw new AttachmentNotFoundError()
    const structure = await this.learning.getStructure(input.lessonId)
    const required =
      structure?.sections.some(
        (section) =>
          section.blockIds.includes(input.blockId) &&
          section.completion?.blockIds.includes(input.blockId) &&
          section.completion.materialItems?.some(
            (entry) => entry.blockId === input.blockId && entry.itemIds.includes(input.itemId),
          ),
      ) ?? false
    if (!required) return { required: false }
    await this.sections.assertBlock(input, lesson, input.blockId)
    if (!block.contentRevision) throw new LessonNotFoundError()
    if (block.contentRevision !== input.expectedRevision) throw new LearningConflictError()
    const progress = await this.learning.recordMaterialDownload({
      userId: input.userId,
      accountId: input.accountId,
      lessonId: input.lessonId,
      blockId: input.blockId,
      revision: block.contentRevision,
      itemId: input.itemId,
      at: this.clock(),
    })
    return { required: true, progress }
  }
}

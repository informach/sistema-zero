import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { LiveConflictError } from '../../domain/live/live.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type {
  StudioLessonBindingRepository,
  StudioLessonOwner,
} from '../../domain/ports/studio-lesson-binding-repository.port'
import { studioLessonBaseline } from '../../domain/studio/lesson-baseline'
import type { LessonDraftAccessService } from '../creations/lesson-draft-access.service'

/** Resolve a durable authoring baseline only after fresh lesson/section access checks. */
export class OpenLessonStudioService {
  constructor(
    private readonly access: Pick<LessonDraftAccessService, 'assert'>,
    private readonly courses: CourseRepository,
    private readonly bindings: StudioLessonBindingRepository,
  ) {}

  async execute(
    input: StudioLessonOwner & {
      audience?: 'kids' | 'adult'
      privileged: boolean
      lessonId: string
      blockId: string
      readOnly?: boolean
      confirm?: { baselineId: string; environment: unknown }
    },
  ) {
    await this.access.assert({ ...input, tool: 'lesson-studio', fresh: true })
    const lesson = await this.courses.findLessonWithContent(input.lessonId, {
      includeAttachments: false,
    })
    const block = lesson?.blocks.find((item) => item.id === input.blockId)
    if (!lesson?.isPublished || block?.content.kind !== 'studio') throw new LessonNotFoundError()
    const course = await this.courses.findCourseById(lesson.courseId)
    if (!course || course.modality === 'live')
      throw new LiveConflictError('Abra este projeto pela sala da oficina.')
    const stored = await this.bindings.find(input, input.blockId)
    if (stored) {
      if (
        stored.workspaceId ||
        stored.baseline.lessonId !== input.lessonId ||
        stored.baseline.courseId !== lesson.courseId
      )
        throw new LiveConflictError('O vínculo deste projeto mudou. Reabra a aula para continuar.')
      if (
        input.confirm &&
        (input.confirm.baselineId !== stored.baseline.id ||
          studioProjectContinuityIssue(
            input.confirm.environment,
            stored.baseline.configuration.initialProject,
          ))
      )
        throw new LiveConflictError('O vínculo deste projeto mudou. Reabra a aula para continuar.')
      return { ...stored.baseline, bound: true, readOnly: Boolean(input.readOnly) }
    }
    const baseline = studioLessonBaseline({
      blockId: input.blockId,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      configuration: block.content,
    })
    // Preparation cannot bind an incompatible legacy draft before the browser has checked it.
    if (!input.confirm || input.readOnly)
      return { ...baseline, bound: false, readOnly: Boolean(input.readOnly) }
    if (
      input.confirm.baselineId !== baseline.id ||
      studioProjectContinuityIssue(input.confirm.environment, baseline.configuration.initialProject)
    )
      throw new LiveConflictError(
        'A configuração desta aula mudou. Seu trabalho foi preservado; reabra a aula.',
      )
    const admitted = await this.bindings.bindRecorded(input, baseline)
    if (admitted.baseline.id !== baseline.id)
      throw new LiveConflictError(
        'O projeto foi aberto em outro aparelho. Reabra a aula para continuar.',
      )
    return { ...admitted.baseline, bound: true, readOnly: false }
  }
}

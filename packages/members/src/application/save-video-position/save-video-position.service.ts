import { LessonNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import type { CheckAccessService } from '../access/check-access.service'

export interface VideoPositionView {
  lessonId: string
  positionSeconds: number
  updatedAt: string
}

/**
 * Salva a posição de reprodução do vídeo (throttled pelo client). Também marca a
 * aula como "última acessada" do curso (alimenta o "continuar de onde parou").
 */
export class SaveVideoPositionService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly positions: VideoPositionRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    lessonId: string,
    positionSeconds: number,
    privileged = false,
  ): Promise<VideoPositionView> {
    const { course } = await this.checkAccess.requireBySlug(userId, courseSlug, privileged)
    const lesson = await this.courses.findLesson(lessonId)
    // Aula rascunho é invisível ao aluno → não aceita posição de vídeo.
    if (!lesson || lesson.courseId !== course.id || !lesson.isPublished) {
      throw new LessonNotFoundError()
    }

    const now = this.clock()
    await this.positions.upsert(userId, lessonId, course.id, positionSeconds, now)
    return { lessonId, positionSeconds, updatedAt: now.toISOString() }
  }
}

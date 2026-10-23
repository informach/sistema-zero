import { LessonNotFoundError } from '../../domain/course/course.errors'
import { LiveAccessError } from '../../domain/live/live.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LearningRepository } from '../../domain/ports/learning-repository.port'
import type { LiveLessonAccessPort } from '../../domain/ports/live-lesson-access.port'

/** Quem pede as anotações: o ator das rotas das oficinas (`resolveLiveActor`). */
export interface TeacherNotesActor {
  id: string
  /** Equipe ativa (superadmin/admin/staff). */
  staff: boolean
  /** Administração (superadmin/admin): vê as anotações de qualquer curso ao vivo. */
  admin?: boolean
}

/**
 * As ANOTAÇÕES DA PROFESSORA de uma aula de curso ao vivo (14/10/2026): o texto curto de cada
 * parte ("mostrar o bloco de colisão, desenhar a seta no sprite") que só quem conduz lê. Saem da
 * versão PUBLICADA da aula (`lesson_structures`), a mesma que a turma vê.
 *
 * Quem lê: a administração, ou a professora (equipe) atribuída a uma turma DESTE curso — a régua
 * das rotas das oficinas, em que equipe não atribuída não enxerga a turma dos outros. A view do
 * aluno nunca leva o campo (`GetLessonService` monta as partes campo a campo).
 */
export class LiveTeacherNotesService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly learning: Pick<LearningRepository, 'getStructure'>,
    private readonly live: Pick<LiveLessonAccessPort, 'isAssignedTeacher'>,
  ) {}

  async read(
    actor: TeacherNotesActor,
    lessonId: string,
  ): Promise<{ notes: Record<string, string> }> {
    if (!actor.staff) throw new LiveAccessError('Acesso da equipe necessário.')
    const lesson = await this.courses.findLesson(lessonId)
    // Rascunho não tem versão publicada para conduzir: 404, como na rota de aula.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const course = await this.courses.findCourseById(lesson.courseId)
    if (course?.modality !== 'live') throw new LessonNotFoundError()
    if (
      !actor.admin &&
      !(await this.live.isAssignedTeacher({ teacherId: actor.id, courseId: course.id }))
    )
      throw new LiveAccessError('As anotações desta aula são da professora da turma.')
    const structure = await this.learning.getStructure(lessonId)
    const notes: Record<string, string> = {}
    for (const section of structure?.sections ?? []) {
      const text = section.teacherNotes?.trim()
      if (text) notes[section.id] = text
    }
    return { notes }
  }
}

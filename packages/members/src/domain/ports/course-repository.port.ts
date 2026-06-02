import type { Course, Lesson, LessonWithContent, ModuleWithLessons } from '../course/course'

/** Leitura da árvore de conteúdo (Fatia 1 = só leitura; autoria é fatia seguinte). */
export interface CourseRepository {
  findCourseBySlug(slug: string): Promise<Course | null>
  findCourseById(id: string): Promise<Course | null>
  /** Aula sem o conteúdo dos blocos (para checagem de acesso / mark-complete). */
  findLesson(lessonId: string): Promise<Lesson | null>
  /** Cursos publicados por uma lista de slugs (para montar "meus cursos"). */
  findPublishedCoursesBySlugs(slugs: string[]): Promise<Course[]>
  /** Módulos do curso, cada um com suas aulas resumidas (sem o conteúdo dos blocos). */
  findOutline(courseId: string): Promise<ModuleWithLessons[]>
  /** Aula com o conteúdo completo (blocos ordenados + anexos). */
  findLessonWithContent(lessonId: string): Promise<LessonWithContent | null>
  /** Total de aulas do curso (denominador do progresso). */
  countLessons(courseId: string): Promise<number>
}

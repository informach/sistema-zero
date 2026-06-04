import type { Course, Lesson, LessonWithContent, ModuleWithLessons } from '../course/course'

/** Leitura da árvore de conteúdo (Fatia 1 = só leitura; autoria é fatia seguinte). */
export interface CourseRepository {
  findCourseBySlug(slug: string): Promise<Course | null>
  findCourseById(id: string): Promise<Course | null>
  /** Aula sem o conteúdo dos blocos (para checagem de acesso / mark-complete). */
  findLesson(lessonId: string): Promise<Lesson | null>
  /** Cursos ACESSÍVEIS (published ou archived) por slugs — para montar "meus cursos". */
  findAccessibleCoursesBySlugs(slugs: string[]): Promise<Course[]>
  /** Cursos por slugs, QUALQUER status (admin: progresso/detalhe inclui draft/archived). */
  findCoursesBySlugs(slugs: string[]): Promise<Course[]>
  /** TODOS os cursos `published` (catálogo/descoberta), ordenados por título. */
  listPublishedCourses(): Promise<Course[]>
  /** Módulos do curso, cada um com suas aulas resumidas (sem o conteúdo dos blocos). */
  findOutline(courseId: string): Promise<ModuleWithLessons[]>
  /** Aula com o conteúdo completo (blocos ordenados + anexos). */
  findLessonWithContent(lessonId: string): Promise<LessonWithContent | null>
  /** Total de aulas do curso (denominador do progresso). */
  countLessons(courseId: string): Promise<number>
  /** Total de aulas por curso, em lote (evita N+1 em "meus cursos"). courseId → total. */
  countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>>
}

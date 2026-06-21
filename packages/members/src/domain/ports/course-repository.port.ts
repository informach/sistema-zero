import type {
  Course,
  CourseAudience,
  Lesson,
  LessonWithContent,
  ModuleWithLessons,
} from '../course/course'

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
  /**
   * TODOS os cursos `published` da AUDIÊNCIA (catálogo/descoberta), ordenados por
   * título. O param é obrigatório: cada vitrine (community/community-kids) decide.
   */
  listPublishedCourses(audience: CourseAudience): Promise<Course[]>
  /**
   * Módulos do curso, cada um com suas aulas resumidas (sem o conteúdo dos blocos).
   * `publishedOnly` filtra aulas rascunho (visão do ALUNO); o admin vê tudo.
   */
  findOutline(courseId: string, opts?: { publishedOnly?: boolean }): Promise<ModuleWithLessons[]>
  /** Aula com o conteúdo completo (blocos ordenados + anexos). */
  findLessonWithContent(lessonId: string): Promise<LessonWithContent | null>
  /** Total de aulas do curso, qualquer status (visão de AUTORIA no admin). */
  countLessons(courseId: string): Promise<number>
  /** Total de aulas PUBLICADAS (denominador do progresso do aluno). */
  countPublishedLessons(courseId: string): Promise<number>
  /** Ids das aulas PUBLICADAS do módulo (detecção do baú de fim de unidade). */
  listPublishedLessonIds(moduleId: string): Promise<string[]>
  /**
   * Bloco de estúdio da aula PUBLICADA imediatamente anterior (ordem do curso:
   * `module.sortOrder`, depois `lesson.sortOrder`) que esteja na MESMA cadeia
   * `chain`. Pula aulas avulsas/de outra cadeia/teoria. `null` se é a 1ª da cadeia.
   * Usado pelo carryover do Estúdio (continuar o projeto de onde parou).
   */
  findPrecedingStudioBlockInChain(
    courseId: string,
    lessonId: string,
    chain: string,
  ): Promise<{ blockId: string; lessonId: string } | null>
  /** Total de aulas por curso, em lote (admin). courseId → total. */
  countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>>
  /** Total de aulas PUBLICADAS por curso, em lote (evita N+1 em "meus cursos"). */
  countPublishedLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>>
}

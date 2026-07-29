import type {
  Course,
  CourseAudience,
  CourseLevel,
  CourseTrack,
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
   * Existe um curso-base (`careerSlot=1`) PUBLICADO nesta etapa (audiência+nível+
   * eixo)? A trava `foundation-first` só vale quando há base alcançável — senão a
   * etapa inteira (e a carreira) ficaria presa. Usado pelo gate em profundidade.
   */
  hasPublishedFoundationCourse(
    audience: CourseAudience,
    level: CourseLevel,
    track: CourseTrack,
  ): Promise<boolean>
  /**
   * Módulos do curso, cada um com suas aulas resumidas (sem o conteúdo dos blocos).
   * `publishedOnly` filtra aulas rascunho (visão do ALUNO); o admin vê tudo.
   */
  findOutline(courseId: string, opts?: { publishedOnly?: boolean }): Promise<ModuleWithLessons[]>
  /**
   * Outlines de VÁRIOS cursos em lote (módulos + aulas em 2 queries, sem N+1).
   * Mesmo `publishedOnly` do `findOutline`. courseId → módulos com aulas ordenados.
   */
  findOutlinesByCourseIds(
    courseIds: string[],
    opts?: { publishedOnly?: boolean },
  ): Promise<Map<string, ModuleWithLessons[]>>
  /**
   * Aula com o conteúdo completo (blocos ordenados + anexos). `includeAttachments`
   * (default `true`) pode ser `false` p/ leituras que só usam os blocos (ex.: os
   * GETs lazy do Studio) — evita 1 query de anexos descartada; `attachments` volta `[]`.
   */
  findLessonWithContent(
    lessonId: string,
    opts?: { includeAttachments?: boolean },
  ): Promise<LessonWithContent | null>
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

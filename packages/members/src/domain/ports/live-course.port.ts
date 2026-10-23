import type { CourseModality } from '@sistemazero/core/course/modality'
import type { LiveCourseSummary, LiveStudioConfig } from '@sistemazero/core/live'

/** Um curso lido pelas oficinas: o resumo público + o que decide se ele pode ter turma. */
export interface LiveCourseRecord extends LiveCourseSummary {
  status: 'draft' | 'published' | 'archived'
  modality: CourseModality
}

/** As partes da aula PUBLICADA, na ordem (a estrutura publicada, `lesson_structures`). */
export interface LiveLessonSections {
  lessonId: string
  courseId: string
  /** A aula está publicada (`is_published`); rascunho não é conteúdo de encontro. */
  published: boolean
  sectionIds: string[]
}

/** Um bloco Estúdio ATIVO da aula publicada: a semente e a curadoria do projeto ao vivo. */
export interface LiveStudioBlockRecord {
  blockId: string
  lessonId: string
  courseId: string
  /** Nome do projeto contínuo; `null` = o projeto é deste bloco só. */
  chain: string | null
  initialProject: unknown
  studio: LiveStudioConfig
}

/**
 * Leitura dos cursos AO VIVO pelas oficinas (14/10/2026): a turma é de um curso, cada aula
 * publicada é um encontro. Só leitura; nenhuma escrita de curso passa por aqui.
 */
export interface LiveCoursePort {
  /** O curso, de qualquer modalidade (quem chama confere), com as aulas PUBLICADAS em ordem. */
  findCourse(courseId: string): Promise<LiveCourseRecord | null>
  /**
   * Cursos AO VIVO não arquivados: por ids (os das turmas listadas) e/ou pela plataforma.
   * Sem filtro nenhum, todos os cursos ao vivo.
   */
  listLiveCourses(filter: {
    ids?: string[]
    audience?: 'adult' | 'kids'
  }): Promise<LiveCourseRecord[]>
  lessonSections(lessonId: string): Promise<LiveLessonSections | null>
  /** `null` quando o bloco não é um Estúdio ativo desta aula. */
  studioBlock(lessonId: string, blockId: string): Promise<LiveStudioBlockRecord | null>
}

import { type CourseModality, courseModalityOf } from '@sistemazero/core/course/modality'

/** Uma linha que explica a escolha no formulário do curso. */
export const LIVE_MODALITY_HINT =
  'Ao vivo: os encontros acontecem em turmas e o curso só aparece em Oficinas.'

/** O curso é ao vivo? Ausente ou desconhecido = gravado (members antigo). */
export function isLiveCourse(course: { modality?: string | null } | null | undefined): boolean {
  return courseModalityOf(course?.modality) === 'live'
}

/**
 * O aviso antes de salvar a TROCA de modalidade. O servidor só deixa trocar enquanto o curso não
 * tem turma (409 com o recado); o aviso diz o que muda para quem já vê o curso.
 */
export function modalityChangeWarning(from: CourseModality, to: CourseModality): string | null {
  if (from === to) return null
  return to === 'live'
    ? 'O curso passa a ser ao vivo: sai da trilha, da Jornada e do catálogo, e só aparece em Oficinas, para quem tem vaga numa turma.'
    : 'O curso passa a ser gravado: sai de Oficinas e volta a aparecer na trilha e no catálogo da plataforma.'
}

/**
 * O "Ver aula publicada" do editor de aula: o endereço da aula no app do aluno e se ele já abre
 * (curso E aula publicados; rascunho dá 404 na visão do aluno). `null` = sem botão: sem o app
 * configurado, ou curso AO VIVO, cuja aula abre pela sala do encontro e não pela trilha.
 */
export function studentLessonLink(
  course: {
    slug: string
    audience: 'adult' | 'kids'
    modality?: string | null
    status: string
    lessonPublished: boolean
  } | null,
  urls: { adult?: string; kids?: string } | undefined,
  lessonId: string,
): { url: string; enabled: boolean } | null {
  if (!course || isLiveCourse(course)) return null
  const base = course.audience === 'kids' ? urls?.kids : urls?.adult
  if (!base) return null
  return {
    url: `${base.replace(/\/+$/, '')}/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(lessonId)}`,
    enabled: course.status === 'published' && course.lessonPublished,
  }
}

/** O filtro da lista de cursos: só valores do contrato chegam ao servidor. */
export function modalityFilterParam(value: string | null | undefined): CourseModality | undefined {
  return value === 'live' || value === 'recorded' ? value : undefined
}

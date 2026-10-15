/**
 * Modalidade do curso (14/10/2026, decisão da dona): um curso é GRAVADO ou AO VIVO, nunca os dois.
 *
 * - `recorded`: o curso de sempre (trilha, Jornada do Criador, catálogo, chave-mestra).
 * - `live`: só existe em Oficinas. Cada aula é um encontro marcado de uma turma; o acesso vem da
 *   vaga na turma, pelo prazo dela. Nunca entra na trilha, na Jornada (sem `careerSlot`), na
 *   chave-mestra, na liberação de blocos do Estúdio pelo currículo nem na base do Zappy.
 *
 * O mesmo tema nas duas formas são DOIS cursos (o clone de curso ajuda a começar um do outro).
 */
export const COURSE_MODALITIES = ['recorded', 'live'] as const
export type CourseModality = (typeof COURSE_MODALITIES)[number]
export const DEFAULT_COURSE_MODALITY: CourseModality = 'recorded'

export function isCourseModality(value: unknown): value is CourseModality {
  return COURSE_MODALITIES.some((modality) => modality === value)
}

/** Ausente ou desconhecido = gravado: curso anterior à modalidade é gravado. */
export function courseModalityOf(value: unknown): CourseModality {
  return isCourseModality(value) ? value : DEFAULT_COURSE_MODALITY
}

/** Só o curso gravado participa da Jornada (posições, trilha, liberação de blocos). */
export function modalityJoinsJourney(modality: CourseModality): boolean {
  return modality === 'recorded'
}

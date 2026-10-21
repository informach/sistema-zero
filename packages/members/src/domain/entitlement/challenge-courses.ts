/**
 * Os cursos do Desafio do Primeiro Jogo (30 dias de acesso) e o público de cada um. O Kids desde
 * 09/2026 e o adulto desde 21/10/2026, com a mesma régua de avisos em versões `-adult`.
 */
export type ChallengeAudience = 'kids' | 'adult'

export const CHALLENGE_COURSES: Readonly<Record<string, ChallengeAudience>> = {
  'desafio-primeiro-jogo': 'kids',
  'desafio-primeiro-jogo-adulto': 'adult',
}

export const CHALLENGE_COURSE_REFS = Object.keys(CHALLENGE_COURSES)

/** O público de um curso do Desafio; `null` para qualquer outro curso. */
export function challengeAudience(courseRef: string): ChallengeAudience | null {
  return Object.hasOwn(CHALLENGE_COURSES, courseRef) ? (CHALLENGE_COURSES[courseRef] ?? null) : null
}

/** A chave-mestra que já cobre o curso do Desafio de cada público. */
export const CHALLENGE_MASTER_KEY: Readonly<Record<ChallengeAudience, string>> = {
  kids: 'all_kids_courses',
  adult: 'all_courses',
}

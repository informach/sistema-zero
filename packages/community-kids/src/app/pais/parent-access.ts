import { type ParentPurpose, parentPurpose } from '@/lib/guide'
import type { ProfileAllowance } from '@/lib/profile-allowance'
import type { MyCourseView } from '@/lib/types'

/** A leitura de "meus cursos para pais" (`listParentCourses`); `null` = a chamada falhou. */
export type ParentCoursesRead = {
  status: number
  body?: { courses?: MyCourseView[] } | null
} | null

/**
 * O que a área dos pais mostra para esta conta, numa régua só para o Início e a Família
 * (15/11/2026):
 * - `indisponivel`: não deu para saber (o limite de perfis ou, sem perfil liberado, os cursos
 *   para pais não foram lidos). Pedir para tentar de novo, nunca dizer que nada está incluído:
 *   quem comprou só um curso para pais tem 0 perfis e cairia em "Nenhum perfil liberado".
 * - `nao-incluido`: sem perfil, sem perfil liberado e sem curso para pais.
 * - `area`: a página, com o propósito (`parentPurpose`) e os cursos para pais lidos.
 */
export type ParentArea =
  | { tela: 'indisponivel' }
  | { tela: 'nao-incluido' }
  | { tela: 'area'; purpose: ParentPurpose; courses: MyCourseView[] }

export function resolveParentArea(input: {
  profilesCount: number
  allowance: ProfileAllowance
  parentCourses: ParentCoursesRead
}): ParentArea {
  const lidos = input.parentCourses?.status === 200
  const courses = lidos ? (input.parentCourses?.body?.courses ?? []) : []
  if (!input.profilesCount) {
    if (input.allowance.kind === 'unavailable') return { tela: 'indisponivel' }
    if (input.allowance.kind === 'none') {
      if (!lidos) return { tela: 'indisponivel' }
      if (!courses.length) return { tela: 'nao-incluido' }
    }
  }
  return {
    tela: 'area',
    purpose: parentPurpose({
      profilesCount: input.profilesCount,
      allowanceKind: input.allowance.kind,
      hasParentCourses: courses.length > 0,
    }),
    courses,
  }
}

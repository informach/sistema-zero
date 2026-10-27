import { POSTOS_DA_JORNADA } from './ilhas'
import type { CurriculoDeBlocos } from './membros'

export interface OndeAprender {
  courseId: string
  titulo: string
  slug: string
  posto: string | null
}

/**
 * "Aprenda isso em": os cursos publicados que liberam o bloco, do posto mais cedo para o mais
 * tarde (curso sem posto, como Maestria, por último) e, no mesmo posto, por título.
 */
export function aprendaIssoEm(bloco: string, curriculo: CurriculoDeBlocos): OndeAprender[] {
  const ordem = (posto: string | null) => {
    const i = posto ? POSTOS_DA_JORNADA.indexOf(posto as (typeof POSTOS_DA_JORNADA)[number]) : -1
    return i < 0 ? Number.POSITIVE_INFINITY : i
  }
  return curriculo.cursos
    .filter((c) => c.blocos.includes(bloco))
    .map((c) => ({ courseId: c.courseId, titulo: c.titulo, slug: c.slug, posto: c.posto }))
    .sort((a, b) => ordem(a.posto) - ordem(b.posto) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
}

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

/**
 * "Aprenda isso em" do desafio inteiro (A24): na linguagem do posto, o curso-base do posto da ilha;
 * em blocos, o curso mais adiantado entre os primeiros cursos de cada bloco exigido (o que o
 * desafio retoma por último). Vazio quando nenhum curso publicado ensina.
 */
export function aprendaODesafio(
  e: { linguagem: 'blocos' | 'python' | 'texto' | 'pro'; posto: string; blocos: readonly string[] },
  curriculo: CurriculoDeBlocos,
): OndeAprender[] {
  if (e.linguagem !== 'blocos') {
    const base = curriculo.cursosBase?.find((c) => c.posto === e.posto)
    return base
      ? [{ courseId: base.courseId, titulo: base.titulo, slug: base.slug, posto: base.posto }]
      : []
  }
  const ordem = (posto: string | null) =>
    posto ? POSTOS_DA_JORNADA.indexOf(posto as (typeof POSTOS_DA_JORNADA)[number]) : -1
  let melhor: OndeAprender | null = null
  for (const bloco of e.blocos) {
    const primeiro = aprendaIssoEm(bloco, curriculo)[0]
    if (primeiro && (!melhor || ordem(primeiro.posto) > ordem(melhor.posto))) melhor = primeiro
  }
  return melhor ? [melhor] : []
}

/** Os blocos que o desafio pede: os do gabarito, mais os que a equipe acrescentou, menos os que retirou. */
export function blocosExigidos(
  derivados: readonly string[],
  manuais: { acrescentar: readonly string[]; retirar: readonly string[] },
): string[] {
  const fora = new Set(manuais.retirar)
  return [...new Set([...derivados, ...manuais.acrescentar])].filter((b) => !fora.has(b)).sort()
}

export type AvisoDeCobertura = 'sem-curso' | 'bloco-desconhecido' | 'curso-depois-da-ilha'

/**
 * Para cada bloco exigido: de que cursos ele se aprende e o que a equipe precisa saber (nenhum
 * curso publicado libera; o bloco nem existe no catálogo do Estúdio; o curso mais cedo fica num
 * posto DEPOIS do posto da ilha, então a criança chega à ilha antes de poder fazer o desafio).
 */
export function coberturaDosBlocos(
  exigidos: readonly string[],
  curriculo: CurriculoDeBlocos,
  postoDaIlha: string,
): {
  bloco: string
  rotulo: string | null
  cursos: { courseId: string; titulo: string; posto: string | null }[]
  avisos: AvisoDeCobertura[]
}[] {
  const rotulos = new Map(curriculo.catalogo.map((b) => [b.type, b.rotulo]))
  const limite = POSTOS_DA_JORNADA.indexOf(postoDaIlha as (typeof POSTOS_DA_JORNADA)[number])
  return exigidos.map((bloco) => {
    const cursos = aprendaIssoEm(bloco, curriculo).map(({ courseId, titulo, posto }) => ({
      courseId,
      titulo,
      posto,
    }))
    const avisos: AvisoDeCobertura[] = []
    if (!rotulos.has(bloco)) avisos.push('bloco-desconhecido')
    if (cursos.length === 0) avisos.push('sem-curso')
    else {
      const maisCedo = cursos[0]?.posto
      const i = maisCedo
        ? POSTOS_DA_JORNADA.indexOf(maisCedo as (typeof POSTOS_DA_JORNADA)[number])
        : -1
      if (limite >= 0 && (i < 0 || i > limite)) avisos.push('curso-depois-da-ilha')
    }
    return { bloco, rotulo: rotulos.get(bloco) ?? null, cursos, avisos }
  })
}

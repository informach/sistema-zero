import { readStudioProjectExamples, resolveStudioSectionExamples } from '@sistemazero/core/learning'

/** Um projeto e a parte depois da qual ele é o estado (o de entrada da parte N vale como N - 1). */
export interface ProjetoComOrigem {
  parte: number
  project: unknown
}

/**
 * O projeto com que o Estúdio abre ao gravar a parte `numero` sozinha: o que a criança já teria
 * montado nas partes de antes. Cada parte é gravada numa tomada própria, e o palco não guarda o
 * que foi feito; a aula guarda, nos exemplos da equipe, o projeto de entrada de cada parte e a
 * solução de cada uma. Vale o de entrada da própria parte; sem ele, a solução da parte de antes
 * mais próxima que tenha uma; sem nenhum, o inicial (`null`).
 */
export function projetoDaParte(
  projectExamples: unknown,
  sectionIds: readonly string[],
  numero: number,
): unknown | null {
  return projetoDaAula(projectExamples, sectionIds, numero)?.project ?? null
}

/** O mesmo `projetoDaParte`, dizendo de que parte é o estado que ele traz. */
export function projetoDaAula(
  projectExamples: unknown,
  sectionIds: readonly string[],
  numero: number,
): ProjetoComOrigem | null {
  if (!Number.isSafeInteger(numero) || numero < 1 || numero > sectionIds.length) return null
  const read = readStudioProjectExamples(projectExamples)
  if (read.kind !== 'valid') return null
  const of = (index: number) => {
    const id = sectionIds[index]
    if (id === undefined) return null
    const resolved = resolveStudioSectionExamples(read.value, id)
    return resolved.kind === 'resolved' ? resolved : null
  }
  const entry = of(numero - 1)?.entry
  if (entry) return { parte: numero - 1, project: entry }
  for (let i = numero - 2; i >= 0; i--) {
    const solution = of(i)?.solution
    if (solution) return { parte: i + 1, project: solution }
  }
  return null
}

/**
 * Entre a tomada de uma parte de antes (o que o robô montou) e o projeto da aula, o mais novo:
 * a tomada vale enquanto a aula não conhece um estado de depois dela. Uma tomada antiga (a parte 2
 * regravada depois de o palco reiniciar) não passa na frente do projeto de entrada da parte 6, que
 * já tem o que as partes 4 e 5 montam (Ilha do Farol, Aula 2, 22/11/2026). No empate, a tomada:
 * é o que a gravação de antes deixou de verdade.
 */
export function escolherProjeto(
  gravado: ProjetoComOrigem | null,
  daAula: ProjetoComOrigem | null,
): unknown | null {
  if (gravado && daAula && daAula.parte > gravado.parte) return daAula.project
  return gravado?.project ?? daAula?.project ?? null
}

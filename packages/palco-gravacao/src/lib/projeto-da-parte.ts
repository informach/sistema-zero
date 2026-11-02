import { readStudioProjectExamples, resolveStudioSectionExamples } from '@sistemazero/core/learning'

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
  if (entry) return entry
  for (let i = numero - 2; i >= 0; i--) {
    const solution = of(i)?.solution
    if (solution) return solution
  }
  return null
}

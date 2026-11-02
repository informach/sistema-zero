/** O projeto de um Estúdio como ficou numa tomada da parte `parte`, gravada em `at`. */
export interface ProjetoGravado {
  parte: number
  at: number
  project: unknown
}

/**
 * O projeto com que a parte `numero` continua: o da tomada mais recente da parte mais perto
 * antes dela. Regravar uma parte troca o que as seguintes recebem; gravar uma parte de antes
 * depois não muda o que uma posterior já usou.
 */
export function projetoAntes(gravados: readonly ProjetoGravado[], numero: number): unknown | null {
  let melhor: ProjetoGravado | null = null
  for (const g of gravados) {
    if (g.parte >= numero) continue
    if (!melhor || g.parte > melhor.parte || (g.parte === melhor.parte && g.at > melhor.at))
      melhor = g
  }
  return melhor?.project ?? null
}

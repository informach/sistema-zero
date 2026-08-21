/**
 * Autoridade "a leitura mais nova vence" para buscas que se sobrepõem
 * (polling, foco, troca de filtro, paginação): cada leitura pega uma geração
 * ao COMEÇAR e, em cada publicação de estado, só segue valendo se ainda for a
 * mais nova. `invalidate` descarta tudo que está em voo sem iniciar leitura
 * nenhuma (unmount).
 *
 * Vive como lib PURA de propósito. A versão anterior era testada renderizando
 * o componente da fila com `mock.module` de módulos compartilhados
 * (next/navigation, @/lib/api) — e o registry global do bun:test fazia esse
 * mock vazar entre arquivos no Linux do CI (21/08: três vermelhos seguidos, o
 * último um hang de 30 min). Regra do pacote: lógica em lib pura testada,
 * componente fino.
 */
export interface LatestWins {
  /** Começa uma leitura: devolve a geração dela (e a torna a mais nova). */
  begin(): number
  /** A leitura desta geração ainda é a mais nova? */
  isCurrent(generation: number): boolean
  /** Descarta o que está em voo sem começar leitura nova (unmount). */
  invalidate(): void
}

export function createLatestWins(): LatestWins {
  let generation = 0
  return {
    begin() {
      generation += 1
      return generation
    },
    isCurrent(g) {
      return g === generation
    },
    invalidate() {
      generation += 1
    },
  }
}

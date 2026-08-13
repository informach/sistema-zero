/**
 * Cursor do palco quando a MÃO está em jogo — compartilhado pelo editor de
 * vetor e pelo de mapa (os dois únicos com a ferramenta Mão; o pixel não tem).
 *
 * Sem isto, escolher a Mão não mudava nada na tela: a única regra existente era
 * um `grab` preso à barra de espaço, e o arrasto nunca virava `grabbing`. Mora
 * num módulo próprio porque duplicar o ternário nos dois palcos é exatamente o
 * tipo de assimetria que o CLAUDE.md já registra como arrependimento.
 */
export type StageCursor = 'grab' | 'grabbing' | undefined

export function stageCursor(options: {
  /** A ferramenta ativa é a Mão. */
  handTool: boolean
  /** Barra de espaço segurada = Mão temporária (só o vetor tem). */
  spaceHeld?: boolean
  /** Um gesto de arrastar a tela está em andamento. */
  panning: boolean
}): StageCursor {
  // Arrastando vence: a mão fechada é o retorno de que o gesto pegou.
  if (options.panning) return 'grabbing'
  return options.handTool || options.spaceHeld === true ? 'grab' : undefined
}

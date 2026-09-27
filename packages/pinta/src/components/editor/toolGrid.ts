/**
 * A grade de um grupo das caixas de ferramentas (pixel e vetor; 11/09/2026, a tela-modelo): duas
 * colunas de 40px com 8px de vão (a caixa inteira mede 104px, como na imagem); o botão que sobra
 * sozinho na última linha fica no MEIO dela. Os grupos são grades separadas, e não uma só com os
 * divisores dentro, justamente para essa regra valer por grupo.
 */
export const TOOL_GRID =
  'grid grid-cols-2 justify-items-center gap-2 [&>:last-child:nth-child(odd)]:col-span-2'

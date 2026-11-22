import type { ExtensionExample } from '#extensions'
import { JOGO_D_IR } from './__gen_jogoD'
import { JOGO_D_ASSETS } from './jogoD.generated'
import { JOGO_D_RESUMO } from './jogoDResumo'

/**
 * O jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): o 2D de grande porte, um mundo
 * do Pinta com seis regiões, três cavernas e quatro casas. Na galeria desde o lote 9, carregado só
 * no clique (`bigExamples.ts`).
 */
export const jogoDExample: ExtensionExample = {
  ...JOGO_D_RESUMO,
  concepts: [...JOGO_D_RESUMO.concepts],
  ir: JOGO_D_IR,
  assets: JOGO_D_ASSETS,
}

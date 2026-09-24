import * as correDino from './figuras/correDino'
import * as espaco from './figuras/espaco'
import * as gorilas from './figuras/gorilas'
import { desenharCidade } from './fundos/cidade'
import { desenharEstrelas } from './fundos/estrelas'
import { desenharFarol } from './fundos/farol'
import { desenharFloresta } from './fundos/floresta'
import { desenharJardim } from './fundos/jardim'
import type { CaixaDaFigura, DesenhoDeFigura, DesenhoDeFundo } from './pincel'

/**
 * O CATÁLOGO: a única lista do que a arte do Jogo 2D sabe desenhar.
 *
 * ⭐ Cada figura vem com a CAIXA natural dela — o tamanho que ela tem no jogo. É o que permite
 * ao palco de cena posicioná-la na convenção dele (`(x, y)` é o meio do chão sob a figura) sem
 * que nenhum dos 45 palcos precise saber quanto mede um Dino.
 */

export interface EntradaDeFigura {
  desenhar: DesenhoDeFigura
  caixa: CaixaDaFigura
}

export const FIGURAS = {
  dino: { desenhar: correDino.desenharDino, caixa: correDino.CAIXA_DO_DINO },
  cacto: { desenhar: correDino.desenharCacto, caixa: correDino.CAIXA_DO_CACTO },
  pedra: { desenhar: correDino.desenharPedra, caixa: correDino.CAIXA_DA_PEDRA },
  passaro: { desenhar: correDino.desenharPassaro, caixa: correDino.CAIXA_DO_PASSARO },
  ovo: { desenhar: correDino.desenharOvo, caixa: correDino.CAIXA_DO_OVO },
  arvore: { desenhar: correDino.desenharArvore, caixa: correDino.CAIXA_DA_ARVORE },
  nave: { desenhar: espaco.desenharNave, caixa: espaco.CAIXA_DA_NAVE },
  asteroide: { desenhar: espaco.desenharAsteroide, caixa: espaco.CAIXA_DO_ASTEROIDE },
  tiro: { desenhar: espaco.desenharTiro, caixa: espaco.CAIXA_DO_TIRO },
  chama: { desenhar: espaco.desenharChama, caixa: espaco.CAIXA_DA_CHAMA },
  gorila: { desenhar: gorilas.desenharGorila, caixa: gorilas.CAIXA_DO_GORILA },
  banana: { desenhar: gorilas.desenharBanana, caixa: gorilas.CAIXA_DA_BANANA },
  predio: { desenhar: gorilas.desenharPredio, caixa: gorilas.CAIXA_DO_PREDIO },
} as const satisfies Record<string, EntradaDeFigura>

export type NomeDaFigura = keyof typeof FIGURAS

export const FUNDOS = {
  floresta: desenharFloresta,
  estrelas: desenharEstrelas,
  cidade: desenharCidade,
  jardim: desenharJardim,
  farol: desenharFarol,
} as const satisfies Record<string, DesenhoDeFundo>

export type NomeDoFundo = keyof typeof FUNDOS

export const NOMES_DE_FIGURA = Object.keys(FIGURAS) as NomeDaFigura[]
export const NOMES_DE_FUNDO = Object.keys(FUNDOS) as NomeDoFundo[]

export const ehNomeDeFigura = (v: unknown): v is NomeDaFigura =>
  typeof v === 'string' && Object.hasOwn(FIGURAS, v)
export const ehNomeDeFundo = (v: unknown): v is NomeDoFundo =>
  typeof v === 'string' && Object.hasOwn(FUNDOS, v)

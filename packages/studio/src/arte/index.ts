/**
 * `@sistemazero/studio/arte` — a arte do Jogo 2D como fonte ÚNICA.
 *
 * ⭐⭐ Por que este módulo existe: os personagens do Jogo 2D (o Dino, o cacto, a nave, os
 * gorilas, a floresta, as estrelas) sempre viveram dentro de TEMPLATE LITERALS no runtime da
 * extensão — strings que o TypeScript não enxerga, que ninguém pode importar e que já derrubaram
 * o pacote dez vezes por uma crase crua. Enquanto era assim, a cena das aulas não tinha como usar
 * a arte do jogo e acabou com um segundo Dino, desenhado à mão em SVG: a criança montava um jogo
 * e depois via, na aula seguinte, uma silhueta chapada que não se parecia com ele.
 *
 * Aqui a arte é código de verdade, e as duas superfícies consomem DELA: o runtime do jogo, que
 * passa o `ctx` do canvas direto (o `Pincel` é um `Pick` do `CanvasRenderingContext2D`), e o
 * palco de cena do member-shell, que passa um `PincelSvg`. Uma arte só, dois destinos.
 *
 * ⚠️ O subpath é LEVE de propósito (molde de `./controls` e `./server-examples`): nada de React,
 * Blockly ou Monaco, e nada que toque o DOM em runtime — a cena de aula renderiza no servidor.
 */

export type { EntradaDeFigura, NomeDaFigura, NomeDoFundo } from './catalogo'
export {
  ehNomeDeFigura,
  ehNomeDeFundo,
  FIGURAS,
  FUNDOS,
  NOMES_DE_FIGURA,
  NOMES_DE_FUNDO,
} from './catalogo'
/**
 * O HUD do jogo: coração, barra e as cores de fábrica do placar. ⚠️ Fora de `FIGURAS`: não é
 * figura de elenco, é interface — quem o consome é o placar da cena, não o `ArteSvg`.
 */
export {
  CORACAO,
  CORES_DO_HUD,
  caminhoDoCoracao,
  desenharBarra,
  desenharCoracao,
  desenharCoracoes,
} from './hud'
export type {
  Ambiente,
  AreaDoFundo,
  CaixaDaFigura,
  DesenhoDeFigura,
  DesenhoDeFundo,
  DetalheDoFundo,
  Figura,
  Pincel,
  Retangulo,
} from './pincel'
export type { NoSvg } from './pincelSvg'
export { PincelSvg, svgEmTexto } from './pincelSvg'
export { sorteioComSemente } from './semente'

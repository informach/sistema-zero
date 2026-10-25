import {
  aLendaDoHeroiBasicoExample,
  cacaEstelarBasicoExample,
  cercoNaBaseBasicoExample,
  corridaInfinitaExample,
  crossingExample,
  defesaDaTorreBasicoExample,
  dodgeExample,
  labirintoRobosExample,
  meuHeroiMoldaExample,
  minaDeCristaisBasicoExample,
  mundoBlocosExample,
  nightExample,
  patrulhaEspacialExample,
  pegaEstrelasExample,
  raceExample,
  reinoCogumeloExample,
  reunirRebanhoBasicoExample,
  rotatingCubeExample,
  shapesExample,
  stackExample,
  swarmExample,
} from './examples'

/**
 * Ordem da galeria = PROGRESSÃO (review 3D, lote 7): demos curtas → jogos completos
 * simples → jogos maiores → kits prontos por último. O "Pega-Estrelas" é o primeiro
 * jogo e só usa o núcleo iniciante-3d; o `exampleProgression.test.ts` trava os blocos.
 */
export const GAME_THREE_D_EXAMPLE_SECTIONS = {
  demos: [rotatingCubeExample, shapesExample, nightExample],
  simples: [pegaEstrelasExample, dodgeExample, swarmExample, corridaInfinitaExample],
  maiores: [
    labirintoRobosExample,
    mundoBlocosExample,
    patrulhaEspacialExample,
    meuHeroiMoldaExample,
    defesaDaTorreBasicoExample,
    reunirRebanhoBasicoExample,
    aLendaDoHeroiBasicoExample,
    cacaEstelarBasicoExample,
    cercoNaBaseBasicoExample,
    minaDeCristaisBasicoExample,
  ],
  kits: [crossingExample, raceExample, stackExample, reinoCogumeloExample],
} as const

export const gameThreeDExamples = [
  ...GAME_THREE_D_EXAMPLE_SECTIONS.demos,
  ...GAME_THREE_D_EXAMPLE_SECTIONS.simples,
  ...GAME_THREE_D_EXAMPLE_SECTIONS.maiores,
  ...GAME_THREE_D_EXAMPLE_SECTIONS.kits,
] as const

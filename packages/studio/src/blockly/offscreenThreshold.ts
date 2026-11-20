/**
 * A partir de quantos blocos a montagem sob demanda liga (`offscreenBodies.ts`). Num arquivo
 * próprio para o painel decidir sem carregar o módulo: ele só entra no projeto que passa disto,
 * fora do pacote de abertura do modo Blocos. Os jogos dos cursos têm de 70 a 80 blocos.
 */
export const OFFSCREEN_BODIES_MIN_BLOCKS = 1500

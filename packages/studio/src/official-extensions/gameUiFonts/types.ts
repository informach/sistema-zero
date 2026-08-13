/**
 * Uma fonte da interface dos jogos, pronta para virar `@font-face`.
 *
 * Mora num módulo próprio (e não no `gameUiFont.ts`) para os cinco módulos de dados
 * gerados poderem importá-lo sem criar ciclo: o `gameUiFont.ts` importa CADA um
 * deles sob demanda.
 */
export interface GameUiFontFace {
  /** O id que a criança escolhe no bloco e que viaja na IR. */
  id: string
  /** O nome de verdade da fonte, para a doc e para o rótulo. */
  label: string
  /** A faixa de peso que o Google declara — variável traz "400 800", estática "400". */
  weight: string
  /** O `unicode-range` do subset latino, que já cobre os acentos do português. */
  unicodeRange: string
  /** O woff2 em base64. */
  base64: string
}

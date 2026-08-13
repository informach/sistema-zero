/**
 * As cinco fontes que a criança pode escolher — DADO PURO, sem um byte de base64.
 *
 * Fica separado dos módulos de dados de propósito: blocos, documentação e o
 * contexto da IA precisam da lista, e nenhum deles pode arrastar 40 KB de fonte
 * para dentro do bundle só para saber que "Bungee" existe.
 */
import type { GameUiFontFace } from './types'

export const GAME_UI_FONT_IDS = ['baloo2', 'nunito', 'pressStart2P', 'bungee', 'fredoka'] as const
export type GameUiFontId = (typeof GAME_UI_FONT_IDS)[number]

/** Sem escolha, o jogo continua com a fonte de sempre. */
export const DEFAULT_GAME_UI_FONT: GameUiFontId = 'baloo2'

export interface GameUiFontInfo {
  /** O rótulo que a criança vê no bloco. */
  label: string
  /** A família CSS COMPLETA, com as reservas. */
  family: string
}

/**
 * ⚠️ Cada fonte usa o PRÓPRIO nome, não um apelido comum.
 *
 * Um apelido único ("SZ Jogo") pareceria mais simples, mas tem um defeito visual
 * feio: o `unicode-range` do subset latino não cobre TUDO, e o que ficar de fora
 * (seta, emoji) cai na PRÓXIMA fonte da lista. Com apelido, essa próxima seria a
 * Baloo 2 — e numa máquina que tenha a Baloo instalada, escolher Press Start 2P
 * mostraria Baloo no meio da palavra. Com o nome real, a reserva é uma fonte de
 * sistema, que é o que já acontece hoje.
 */
export const GAME_UI_FONTS: Record<GameUiFontId, GameUiFontInfo> = {
  baloo2: {
    label: 'Baloo 2',
    family: '"Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
  },
  nunito: { label: 'Nunito', family: '"Nunito", "Trebuchet MS", sans-serif' },
  pressStart2P: {
    label: 'Press Start 2P',
    family: '"Press Start 2P", "Courier New", monospace',
  },
  bungee: { label: 'Bungee', family: '"Bungee", "Arial Black", sans-serif' },
  fredoka: { label: 'Fredoka', family: '"Fredoka", "Trebuchet MS", sans-serif' },
}

export function isGameUiFontId(value: unknown): value is GameUiFontId {
  return typeof value === 'string' && (GAME_UI_FONT_IDS as readonly string[]).includes(value)
}

export function gameUiFontIdOrDefault(value: unknown): GameUiFontId {
  return isGameUiFontId(value) ? value : DEFAULT_GAME_UI_FONT
}

/**
 * O `@font-face` de UMA fonte.
 *
 * ⚠️ Fonte ESTÁTICA declara `font-weight: 100 900` de propósito. Os runtimes pedem
 * `bold` em 34 lugares, e uma face que só tem o peso 400 faz o navegador SINTETIZAR
 * o negrito — engrossando por deslocamento. Numa fonte de pixel isso vira borrão.
 * Declarar a faixa inteira diz "esta face serve para qualquer peso", e o navegador
 * para de sintetizar. `font-synthesis` não resolveria: é propriedade de elemento, e
 * texto de canvas não tem elemento.
 */
export function gameUiFontFaceCss(id: GameUiFontId, face: GameUiFontFace): string {
  const variavel = face.weight.includes(' ')
  const peso = variavel ? face.weight : '100 900'
  return (
    '@font-face{' +
    `font-family:"${face.label}";` +
    'font-style:normal;' +
    `font-weight:${peso};` +
    'font-display:block;' +
    `src:url(data:font/woff2;base64,${face.base64}) format("woff2");` +
    `unicode-range:${face.unicodeRange};` +
    '}' +
    `:root{--sz-game-ui-font:${GAME_UI_FONTS[id].family};}`
  )
}

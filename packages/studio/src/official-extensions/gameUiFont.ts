/**
 * A fonte da interface dos jogos — agora ESCOLHÍVEL entre cinco.
 *
 * ⭐⭐ O fato que decide a arquitetura: a família NÃO está gravada nos 34 pontos de
 * `ctx.font` dos runtimes. Está gravada no PREFIXO do runtime — o bootstrap antigo
 * embutia `var family = "…"` e era colado na frente da string por
 * `withGameUIFontRuntime`. Os 34 pontos só leem `window.SZGameUIFont.family` em
 * tempo de execução, e os 30 pontos de CSS leem `var(--sz-game-ui-font)`.
 *
 * Logo: basta o bootstrap sair do runtime e passar a ser injetado por quem MONTA o
 * documento, junto da fonte escolhida. Os 64 pontos ficam intocados, e vem de brinde:
 * - **o peso sai dos runtimes.** Hoje ~44 KB de base64 viajam dentro de CADA
 *   `sz-ext/*.js` exportado (são quatro) e dentro do srcdoc a cada recarga;
 * - **o `game-3d-advanced` para de pagar por nada** — ele embarcava a fonte inteira
 *   e usa só uma linha de CSS, sem nenhum `ctx.font`;
 * - **some a corrida de instalação**: o `<style>` antigo nascia num `DOMContentLoaded`
 *   ou `setTimeout(0)`; agora existe no parse do documento.
 *
 * ⚠️ Um apelido de família comum às cinco foi considerado e REJEITADO — ver o
 * comentário do `GAME_UI_FONTS` no catálogo.
 */
import {
  DEFAULT_GAME_UI_FONT,
  GAME_UI_FONTS,
  type GameUiFontId,
  gameUiFontFaceCss,
  gameUiFontIdOrDefault,
} from './gameUiFonts/catalog'
import type { GameUiFontFace } from './gameUiFonts/types'

export type { GameUiFontId, GameUiFontInfo } from './gameUiFonts/catalog'
export {
  DEFAULT_GAME_UI_FONT,
  GAME_UI_FONT_IDS,
  GAME_UI_FONTS,
  gameUiFontIdOrDefault,
  isGameUiFontId,
} from './gameUiFonts/catalog'
export type { GameUiFontFace } from './gameUiFonts/types'

/** A família da fonte padrão. Mantida para quem só precisa de um valor de reserva. */
export const GAME_UI_FONT_FAMILY = GAME_UI_FONTS[DEFAULT_GAME_UI_FONT].family

/**
 * ⚠️ Especificadores ESTÁTICOS, um por fonte (regra 1 do pacote): um
 * `import('./gameUiFonts/' + id)` não é analisável estaticamente, e todo bundler ou
 * empacota as cinco ou não acha nenhuma. Assim cada fonte vira um chunk próprio e um
 * projeto que escolheu Bungee nunca baixa a Fredoka.
 */
const CARREGADORES: Record<GameUiFontId, () => Promise<{ FONTE: GameUiFontFace }>> = {
  baloo2: () => import('./gameUiFonts/baloo2'),
  nunito: () => import('./gameUiFonts/nunito'),
  pressStart2P: () => import('./gameUiFonts/pressStart2P'),
  bungee: () => import('./gameUiFonts/bungee'),
  fredoka: () => import('./gameUiFonts/fredoka'),
}

export interface GameUiFontBundle {
  id: GameUiFontId
  family: string
  css: string
}

/** Carrega SÓ a fonte pedida. Id desconhecido cai no padrão; nunca lança. */
export async function loadGameUiFont(
  id: unknown = DEFAULT_GAME_UI_FONT,
): Promise<GameUiFontBundle> {
  const escolhida = gameUiFontIdOrDefault(id)
  const modulo = await CARREGADORES[escolhida]()
  return {
    id: escolhida,
    family: GAME_UI_FONTS[escolhida].family,
    css: gameUiFontFaceCss(escolhida, modulo.FONTE),
  }
}

/**
 * O pedacinho de JS que publica a família para os runtimes lerem.
 *
 * Precisa rodar ANTES dos scripts de extensão: é na primeira linha deles que a
 * família é capturada. `install` fica como no-op só para não quebrar contrato de
 * quem já tipava a global.
 */
export function gameUiFontBootstrapScript(
  family: string = GAME_UI_FONT_FAMILY,
  id: GameUiFontId = DEFAULT_GAME_UI_FONT,
): string {
  return (
    'window.SZGameUIFont = { ' +
    `id: ${JSON.stringify(id)}, ` +
    `family: ${JSON.stringify(family)}, ` +
    'install: function () {} };'
  )
}

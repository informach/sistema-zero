import { BALOO_2_LATIN_WOFF2_BASE64 } from './gameUiFontData'

export const GAME_UI_FONT_FAMILY = '"Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif'

export const GAME_UI_FONT_CSS =
  '@font-face{' +
  'font-family:"Baloo 2";' +
  'font-style:normal;' +
  'font-weight:400 800;' +
  'font-display:swap;' +
  `src:url(data:font/woff2;base64,${BALOO_2_LATIN_WOFF2_BASE64}) format("woff2");` +
  'unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;' +
  '}' +
  `:root{--sz-game-ui-font:${GAME_UI_FONT_FAMILY};}`

/**
 * Instala a fonte dentro do documento que executa a extensão. O acesso ao DOM
 * acontece só no callback de prontidão (ou no timeout), nunca ao avaliar o
 * bootstrap no head ou em um harness sem document.
 */
export const gameUIFontBootstrapRuntime = `(function () {
  var family = ${JSON.stringify(GAME_UI_FONT_FAMILY)};
  var css = ${JSON.stringify(GAME_UI_FONT_CSS)};
  function install() {
    var doc = window.document;
    if (!doc || !doc.head || doc.querySelector('[data-sz-game-ui-font]')) return;
    var style = doc.createElement('style');
    style.setAttribute('data-sz-game-ui-font', '');
    style.textContent = css;
    doc.head.appendChild(style);
  }
  window.SZGameUIFont = { family: family, install: install };
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('DOMContentLoaded', install, { once: true });
  }
  if (typeof window.setTimeout === 'function') window.setTimeout(install, 0);
})();`

/**
 * Acrescenta o bootstrap sem deslocar o primeiro import de runtimes ESM. Essa
 * primeira linha é parte do contrato dos motores 3D e de seus harnesses.
 */
export function withGameUIFontRuntime(source: string): string {
  if (!source.startsWith('import ')) return `${gameUIFontBootstrapRuntime}\n${source}`
  const firstLineEnd = source.indexOf('\n')
  if (firstLineEnd < 0) return `${source}\n${gameUIFontBootstrapRuntime}`
  return `${source.slice(0, firstLineEnd + 1)}${gameUIFontBootstrapRuntime}\n${source.slice(firstLineEnd + 1)}`
}

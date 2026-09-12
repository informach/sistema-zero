import * as Blockly from 'blockly/core'
import { readSzPalette, SZ_BLOCKLY_FALLBACK, type SzBlocklyPalette } from './themeColors'

// O Blockly não lê CSS custom properties nos componentStyles — precisa de cor
// concreta. Desde que os tokens passaram a apontar para os primitivos da marca,
// a paleta é LIDA DO TEMA em runtime (themeColors.ts); os valores abaixo são a
// reserva de quem não tem DOM (testes) ou não resolve a cor.
const FONT_STYLE = {
  // ⚠️ A família REAL vem do CSS (`[data-sz-theme] .blocklyText` em studio.css,
  // que vence a regra injetada pelo Blockly por especificidade) — é lá que a
  // fonte do host entra. Aqui fica só a reserva de quem não carrega o CSS.
  family: "'Baloo 2', 'Nunito', ui-sans-serif, system-ui, sans-serif",
  weight: '500',
  size: 13,
}

function buildTheme(name: string, palette: SzBlocklyPalette): Blockly.Theme {
  return Blockly.Theme.defineTheme(name, {
    name,
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: palette.bg,
      toolboxBackgroundColour: palette.panel,
      toolboxForegroundColour: palette.fg,
      flyoutBackgroundColour: palette.panelSoft,
      flyoutForegroundColour: palette.fg,
      flyoutOpacity: 1,
      scrollbarColour: palette.border,
      insertionMarkerColour: palette.accent,
      insertionMarkerOpacity: 0.5,
      markerColour: palette.accent,
      cursorColour: palette.accent,
    },
    fontStyle: FONT_STYLE,
  })
}

export const szDarkTheme = buildTheme('sz-dark', SZ_BLOCKLY_FALLBACK.dark)
export const szLightTheme = buildTheme('sz-light', SZ_BLOCKLY_FALLBACK.light)

// ⚠️ `defineTheme` CACHEIA por nome: redefinir 'sz-light' com outras cores
// devolveria o objeto antigo. Cada paleta lida vira um nome derivado, memoizado.
const themeCache = new Map<string, Blockly.Theme>()

function paletteKey(theme: 'dark' | 'light', palette: SzBlocklyPalette): string {
  return `${theme}:${palette.bg}${palette.panel}${palette.panelSoft}${palette.fg}${palette.border}${palette.accent}`
}

/**
 * Tema do Blockly. Com `root`, lê as cores do tema VIGENTE (o Studio dentro da
 * comunidade kids fica azul; no admin segue creme) — ver themeColors.ts.
 */
export function szThemeFor(theme: 'dark' | 'light', root?: Element | null): Blockly.Theme {
  if (root === undefined) return theme === 'light' ? szLightTheme : szDarkTheme
  const palette = readSzPalette(root, theme)
  const key = paletteKey(theme, palette)
  const cached = themeCache.get(key)
  if (cached) return cached
  const built = buildTheme(`sz-${theme}-${themeCache.size}`, palette)
  themeCache.set(key, built)
  return built
}

/** Cor da grade do workspace por tema (opção de injeção, não do Theme). */
export function szGridColourFor(theme: 'dark' | 'light', root?: Element | null): string {
  if (root === undefined) return SZ_BLOCKLY_FALLBACK[theme].grid
  return readSzPalette(root, theme).grid
}

/** Compat: alias do tema PADRÃO (hoje o claro/creme; era o escuro). */
export const szTheme = szLightTheme

export { CATEGORY_COLORS, categoryShades } from './categoryColors'

import * as Blockly from 'blockly/core'

// O Blockly não lê CSS custom properties nos componentStyles — os valores são
// hex equivalentes aos tokens oklch de src/styles/studio.css (paleta do
// sistema-zero, referência comunidade-sistema-zero). Manter os dois em sincronia.
const FONT_STYLE = {
  family: 'ui-sans-serif, system-ui, sans-serif',
  weight: '500',
  size: 13,
}

export const szDarkTheme = Blockly.Theme.defineTheme('sz-dark', {
  name: 'sz-dark',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#030406' /* --color-sz-bg = oklch(0.103 0.01 265) */,
    toolboxBackgroundColour: '#07090d' /* --color-sz-panel = oklch(0.14 0.01 265) */,
    toolboxForegroundColour: '#f5f7f9' /* --color-sz-fg = oklch(0.975 0.003 255) */,
    flyoutBackgroundColour: '#07090d',
    flyoutForegroundColour: '#f5f7f9',
    flyoutOpacity: 1,
    scrollbarColour: '#16181d' /* --color-sz-border = oklch(0.21 0.01 265) */,
    insertionMarkerColour: '#bfea00' /* --color-sz-accent (lime) = oklch(0.875 0.215 122) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#bfea00',
    cursorColour: '#bfea00',
  },
  fontStyle: FONT_STYLE,
})

export const szLightTheme = Blockly.Theme.defineTheme('sz-light', {
  name: 'sz-light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#fbfaf7' /* --color-sz-bg = oklch(0.985 0.004 100) */,
    toolboxBackgroundColour: '#ffffff' /* --color-sz-panel = oklch(1 0 0) */,
    toolboxForegroundColour: '#030406' /* --color-sz-fg = oklch(0.105 0.01 265) */,
    flyoutBackgroundColour: '#eef0f3' /* --color-sz-panel-soft = oklch(0.955 0.004 255) */,
    flyoutForegroundColour: '#030406',
    flyoutOpacity: 1,
    scrollbarColour: '#dcdee1' /* --color-sz-border = oklch(0.9 0.005 255) */,
    insertionMarkerColour: '#007f88' /* --color-sz-accent (cyan) = oklch(0.52 0.14 200) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#007f88',
    cursorColour: '#007f88',
  },
  fontStyle: FONT_STYLE,
})

export function szThemeFor(theme: 'dark' | 'light'): Blockly.Theme {
  return theme === 'light' ? szLightTheme : szDarkTheme
}

/** Cor da grade do workspace por tema (opção de injeção, não do Theme). */
export function szGridColourFor(theme: 'dark' | 'light'): string {
  return theme === 'light' ? '#e9eaee' : '#1b212a'
}

/** Compat: o tema histórico era só o escuro. */
export const szTheme = szDarkTheme

export const CATEGORY_COLORS = {
  html: '#22d3ee',
  css: '#a78bfa',
  dom: '#38bdf8',
  events: '#f0abfc',
  js: '#fbbf24',
  canvas: '#34d399',
  values: '#2dd4bf',
  math: '#60a5fa',
  classes: '#f59e0b',
  objects: '#e879f9',
  functions: '#fb923c',
  search: '#94a3b8',
  advanced: '#f87171',
  extension: '#f472b6',
} as const

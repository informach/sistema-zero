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
    workspaceBackgroundColour: '#0d1117' /* --color-sz-bg */,
    toolboxBackgroundColour: '#161b22' /* --color-sz-panel */,
    toolboxForegroundColour: '#f8f9fa' /* --color-sz-fg */,
    flyoutBackgroundColour: '#161b22',
    flyoutForegroundColour: '#f8f9fa',
    flyoutOpacity: 1,
    scrollbarColour: '#21262d' /* --color-sz-border */,
    insertionMarkerColour: '#c4f042' /* --color-sz-accent (lime) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#c4f042',
    cursorColour: '#c4f042',
  },
  fontStyle: FONT_STYLE,
})

export const szLightTheme = Blockly.Theme.defineTheme('sz-light', {
  name: 'sz-light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#fbfaf6' /* --color-sz-bg */,
    toolboxBackgroundColour: '#ffffff' /* --color-sz-panel */,
    toolboxForegroundColour: '#14161f' /* --color-sz-fg */,
    flyoutBackgroundColour: '#f2f3f5' /* --color-sz-panel-soft */,
    flyoutForegroundColour: '#14161f',
    flyoutOpacity: 1,
    scrollbarColour: '#e1e2e7' /* --color-sz-border */,
    insertionMarkerColour: '#00759e' /* --color-sz-accent (cyan) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#00759e',
    cursorColour: '#00759e',
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

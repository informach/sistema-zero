import * as Blockly from 'blockly/core'

export const szTheme = Blockly.Theme.defineTheme('sz', {
  name: 'sz',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#0b1020',
    toolboxBackgroundColour: '#11172a',
    toolboxForegroundColour: '#e6e9f5',
    flyoutBackgroundColour: '#151c34',
    flyoutForegroundColour: '#e6e9f5',
    flyoutOpacity: 1,
    scrollbarColour: '#232b4a',
    insertionMarkerColour: '#22d3ee',
    insertionMarkerOpacity: 0.5,
    markerColour: '#22d3ee',
    cursorColour: '#22d3ee',
  },
  fontStyle: {
    family: 'Inter, system-ui, sans-serif',
    weight: '500',
    size: 13,
  },
})

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

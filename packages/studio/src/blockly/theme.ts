import * as Blockly from 'blockly/core'

// O Blockly não lê CSS custom properties nos componentStyles — os valores são
// hex equivalentes aos tokens oklch de src/styles/studio.css (paleta do
// sistema-zero, referência comunidade-sistema-zero). Manter os dois em sincronia.
const FONT_STYLE = {
  // Fontes redondas/amigáveis (o host kids carrega Baloo 2 + Nunito); cai para
  // o sistema onde não estiverem disponíveis (admin/member-shell).
  family: "'Baloo 2', 'Nunito', ui-sans-serif, system-ui, sans-serif",
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
    insertionMarkerColour: '#37A6F5' /* --color-sz-accent (azul claro) = oklch(0.72 0.13 245) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#37A6F5',
    cursorColour: '#37A6F5',
  },
  fontStyle: FONT_STYLE,
})

export const szLightTheme = Blockly.Theme.defineTheme('sz-light', {
  name: 'sz-light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#fef9ef' /* --color-sz-bg = oklch(0.975 0.012 85) creme MakeCode */,
    toolboxBackgroundColour: '#fffdf8' /* --color-sz-panel = oklch(0.995 0.006 85) */,
    toolboxForegroundColour: '#1a1410' /* near-black quente p/ o creme */,
    flyoutBackgroundColour: '#f4ecdc' /* --color-sz-panel-soft = oklch(0.945 0.012 85) */,
    flyoutForegroundColour: '#1a1410',
    flyoutOpacity: 1,
    scrollbarColour: '#e6d8c2' /* --color-sz-border = oklch(0.89 0.018 80) */,
    insertionMarkerColour: '#1565C0' /* --color-sz-accent (azul) = oklch(0.52 0.15 252) */,
    insertionMarkerOpacity: 0.5,
    markerColour: '#1565C0',
    cursorColour: '#1565C0',
  },
  fontStyle: FONT_STYLE,
})

export function szThemeFor(theme: 'dark' | 'light'): Blockly.Theme {
  return theme === 'light' ? szLightTheme : szDarkTheme
}

/** Cor da grade do workspace por tema (opção de injeção, não do Theme). */
export function szGridColourFor(theme: 'dark' | 'light'): string {
  return theme === 'light' ? '#efe3cf' : '#1b212a'
}

/** Compat: alias do tema PADRÃO (hoje o claro/creme; era o escuro). */
export const szTheme = szLightTheme

// COR = IDENTIDADE DA CATEGORIA (igual ao MakeCode): cada CATEGORIA de topo tem
// UMA cor bem distinta, e suas SUB-categorias são VARIAÇÕES (tons) dessa cor —
// a cor diz à criança a que categoria o bloco pertence. Cada blocks/<cat>.ts faz
// `const C = CATEGORY_COLORS.<cat>`; os tons de sub-grupo vivem em *_GROUPS.
// ⚠️ "Programação" é UMA categoria (guarda-chuva): TUDO dentro dela — js/math/
// values/dom/events/objects/functions/classes — fica em tons de ÂMBAR/laranja.
export const CATEGORY_COLORS = {
  // Categorias de topo — 9 cores BEM distintas (escolha da usuária). Jogo 2D (rosa)
  // e Jogo 3D (amarelo) são EXTENSÕES — cor própria no blocks.ts de cada uma.
  search: '#8a94a6', // cinza (busca)
  html: '#2348cf', // azul escuro
  css: '#e63946', // vermelho
  svg: '#1aaf54', // verde
  canvas: '#9333ea', // roxo
  advanced: '#38bdf8', // azul do céu (claro)
  extension: '#ec4899', // rosa (extensão genérica = Jogo 2D)
  // Programação (guarda-chuva) — TUDO em tons de LARANJA, variando por área.
  js: '#f97316', // laranja (base — Variáveis/Lógica/Repetições…)
  math: '#ff9a3d', // laranja (Matemática)
  values: '#f0a52a', // dourado (Valores)
  dom: '#e08a14', // âmbar-laranja (Página)
  events: '#ffc266', // dourado-claro (Eventos)
  objects: '#ff8757', // laranja-pêssego (Objetos)
  functions: '#fb6e2e', // laranja-forte (Funções)
  classes: '#e8820c', // âmbar-laranja (Classes)
} as const

// As funções de tonalidade vivem num módulo PURO (sem Blockly) p/ as extensões
// reusarem sem puxar o motor; re-exportadas aqui p/ os blocks/* internos.
export { categoryShades } from './colorShades'

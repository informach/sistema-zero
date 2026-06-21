/**
 * APRESENTAÇÃO do quarto virtual (rótulo PT + emoji + animação), chaveada pelo MESMO
 * `id` do catálogo do members (`domain/room/room-catalog.ts`) — como `BADGE_INFO` ×
 * `BADGE_SLUGS`. O members é a fonte da verdade de existência/preço/posse; aqui mora
 * só o "como aparece". Id desconhecido → ignorado (forward-compat).
 */

/** Grade do quarto (espelha `ROOM_GRID` do members). */
export const ROOM_GRID = { cols: 12, rows: 8 } as const

interface RoomItemInfo {
  labelPt: string
  emoji: string
  w: number
  h: number
  /** Classe de animação CSS (kids globals) — gateada por prefers-reduced-motion. */
  anim?: 'kid-room-grow' | 'kid-room-float' | 'kid-room-twinkle' | 'kid-room-flicker'
}

export const ROOM_ITEM_INFO: Record<string, RoomItemInfo> = {
  // Móveis
  cama: { labelPt: 'Cama', emoji: '🛏️', w: 2, h: 3 },
  cadeira: { labelPt: 'Cadeira', emoji: '🪑', w: 1, h: 2 },
  sofa: { labelPt: 'Sofá', emoji: '🛋️', w: 3, h: 2 },
  estante: { labelPt: 'Estante', emoji: '📚', w: 2, h: 3 },
  bau: { labelPt: 'Baú', emoji: '🧰', w: 2, h: 2 },
  // Decoração
  quadro: { labelPt: 'Quadro', emoji: '🖼️', w: 2, h: 2 },
  estrela: { labelPt: 'Estrela', emoji: '⭐', w: 1, h: 1, anim: 'kid-room-twinkle' },
  janela: { labelPt: 'Janela', emoji: '🪟', w: 2, h: 2 },
  bandeira: { labelPt: 'Bandeira', emoji: '🚩', w: 1, h: 2 },
  ursinho: { labelPt: 'Ursinho', emoji: '🧸', w: 1, h: 1 },
  balao: { labelPt: 'Balão', emoji: '🎈', w: 1, h: 2, anim: 'kid-room-float' },
  relogio: { labelPt: 'Relógio', emoji: '🕐', w: 1, h: 1 },
  // Plantas (crescem)
  planta: { labelPt: 'Planta', emoji: '🪴', w: 1, h: 2, anim: 'kid-room-grow' },
  arvore: { labelPt: 'Árvore', emoji: '🌳', w: 2, h: 3, anim: 'kid-room-grow' },
  // Luzes (piscam)
  luminaria: { labelPt: 'Luminária', emoji: '💡', w: 1, h: 2 },
  vela: { labelPt: 'Vela', emoji: '🕯️', w: 1, h: 1, anim: 'kid-room-flicker' },
  // Pets (animados — campo `pet`)
  'pet-gato': { labelPt: 'Gato', emoji: '🐱', w: 1, h: 1 },
  'pet-cachorro': { labelPt: 'Cachorro', emoji: '🐶', w: 1, h: 1 },
  'pet-passaro': { labelPt: 'Passarinho', emoji: '🐦', w: 1, h: 1 },
}

interface RoomThemeInfo {
  labelPt: string
  /** Fundo do quarto (gradiente CSS). */
  bg: string
}

export const ROOM_THEME_INFO: Record<string, RoomThemeInfo> = {
  aconchego: {
    labelPt: 'Aconchego',
    bg: 'linear-gradient(180deg, #fde9d2 0%, #f6d3a7 60%, #e9b97e 100%)',
  },
  floresta: {
    labelPt: 'Floresta',
    bg: 'linear-gradient(180deg, #c8ecd0 0%, #9fd9ad 60%, #6fbf86 100%)',
  },
  oceano: {
    labelPt: 'Oceano',
    bg: 'linear-gradient(180deg, #cdeaf7 0%, #9bd4ef 60%, #5fb6e0 100%)',
  },
  espaco: {
    labelPt: 'Espaço',
    bg: 'linear-gradient(180deg, #2b2150 0%, #3a2d6e 60%, #4a3a8a 100%)',
  },
  doce: {
    labelPt: 'Doce',
    bg: 'linear-gradient(180deg, #ffe1f0 0%, #ffc3df 60%, #ff9ec9 100%)',
  },
}

const FALLBACK_THEME: RoomThemeInfo = { labelPt: 'Aconchego', bg: '#fde9d2' }

/** Info do tema (sempre definida — id desconhecido cai no aconchego). */
export function themeInfo(id: string): RoomThemeInfo {
  return ROOM_THEME_INFO[id] ?? ROOM_THEME_INFO.aconchego ?? FALLBACK_THEME
}

/** Tema escuro (espaço) → texto/UI clara por cima. (Legado — a escuridão real vem da luz.) */
export function isDarkTheme(themeId: string): boolean {
  return themeId === 'espaco'
}

// ── Pisos (categoria à parte — campo `floor` do estado) ──────────────────────
// Espelha `ROOM_FLOORS` do members por id (travado no teste de conformância).
export interface RoomFloorInfo {
  labelPt: string
  /** Como o chão é pintado no 3D. */
  kind: 'wood' | 'rug' | 'checker'
  color: string
  /** Cor secundária (tábuas/xadrez/borda do tapete). */
  color2: string
}
export const ROOM_FLOOR_INFO: Record<string, RoomFloorInfo> = {
  'piso-madeira-clara': {
    labelPt: 'Madeira clara',
    kind: 'wood',
    color: '#d8b88a',
    color2: '#c7a576',
  },
  'piso-madeira-escura': {
    labelPt: 'Madeira escura',
    kind: 'wood',
    color: '#8a6a48',
    color2: '#73583c',
  },
  'piso-tapete': { labelPt: 'Tapete', kind: 'rug', color: '#7fb3d5', color2: '#5f93b5' },
  'piso-xadrez': { labelPt: 'Xadrez', kind: 'checker', color: '#f0e6d2', color2: '#c8b89a' },
  'piso-ladrilho': { labelPt: 'Ladrilho', kind: 'checker', color: '#e8e0d8', color2: '#b8c8d2' },
}
export const DEFAULT_FLOOR_ID = 'piso-madeira-clara'
const FALLBACK_FLOOR: RoomFloorInfo = {
  labelPt: 'Piso',
  kind: 'wood',
  color: '#d8b88a',
  color2: '#c7a576',
}
export function floorInfo(id: string): RoomFloorInfo {
  return ROOM_FLOOR_INFO[id] ?? ROOM_FLOOR_INFO[DEFAULT_FLOOR_ID] ?? FALLBACK_FLOOR
}

// ── Iluminação/clima (categoria à parte — campo `lighting` do estado) ─────────
// Cada id mapeia parâmetros de luz/atmosfera da cena 3D. Espelha `ROOM_LIGHTINGS`.
export interface LightingPreset {
  labelPt: string
  ambient: { color: string; intensity: number }
  sun: { color: string; intensity: number; position: [number, number, number] }
  /** Cor de fundo da cena (céu/atmosfera). */
  background: string
  /** Cena escura → UI clara por cima + acende as luzes dos móveis. */
  dark?: boolean
  /** Fita de neon (point light extra colorida). */
  neon?: string
  /** Cicla a matiz (modo festa) — gateado por prefers-reduced-motion. */
  party?: boolean
}
export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  dia: {
    labelPt: 'Dia',
    ambient: { color: '#ffffff', intensity: 0.9 },
    sun: { color: '#fff4e0', intensity: 1.1, position: [6, 10, 4] },
    background: '#bfe3f2',
  },
  tarde: {
    labelPt: 'Tarde',
    ambient: { color: '#ffd9b0', intensity: 0.7 },
    sun: { color: '#ff9e57', intensity: 1.0, position: [9, 5, 3] },
    background: '#f4c79a',
  },
  noite: {
    labelPt: 'Noite',
    ambient: { color: '#5566aa', intensity: 0.4 },
    sun: { color: '#6f86d6', intensity: 0.45, position: [4, 8, 5] },
    background: '#1a2140',
    dark: true,
  },
  'neon-rosa': {
    labelPt: 'Neon rosa',
    ambient: { color: '#3a2440', intensity: 0.45 },
    sun: { color: '#9a6ad6', intensity: 0.5, position: [5, 8, 4] },
    background: '#241830',
    dark: true,
    neon: '#ff2fb0',
  },
  'neon-ciano': {
    labelPt: 'Neon ciano',
    ambient: { color: '#243a40', intensity: 0.45 },
    sun: { color: '#6ad0d6', intensity: 0.5, position: [5, 8, 4] },
    background: '#16282e',
    dark: true,
    neon: '#22e0e0',
  },
  festa: {
    labelPt: 'Festa',
    ambient: { color: '#33224a', intensity: 0.5 },
    sun: { color: '#ffffff', intensity: 0.5, position: [5, 9, 4] },
    background: '#1c1430',
    dark: true,
    party: true,
  },
}
export const DEFAULT_LIGHTING_ID = 'dia'
const FALLBACK_LIGHTING: LightingPreset = LIGHTING_PRESETS.dia ?? {
  labelPt: 'Dia',
  ambient: { color: '#ffffff', intensity: 0.9 },
  sun: { color: '#fff4e0', intensity: 1.1, position: [6, 10, 4] },
  background: '#bfe3f2',
}
export function lightingPreset(id: string): LightingPreset {
  return LIGHTING_PRESETS[id] ?? FALLBACK_LIGHTING
}

// ── Paleta de paredes (pintar é GRÁTIS) — espelha ROOM_WALL_PALETTE do members ─
export interface WallSwatch {
  hex: string
  labelPt: string
}
export const ROOM_WALL_PALETTE: readonly WallSwatch[] = [
  { hex: '#f3ede1', labelPt: 'Creme' },
  { hex: '#e7dccb', labelPt: 'Areia' },
  { hex: '#d6ccbb', labelPt: 'Bege' },
  { hex: '#cdd6da', labelPt: 'Cinza frio' },
  { hex: '#aab7be', labelPt: 'Ardósia' },
  { hex: '#f7c9a6', labelPt: 'Pêssego' },
  { hex: '#f0a884', labelPt: 'Damasco' },
  { hex: '#e0796a', labelPt: 'Telha' },
  { hex: '#f9d9c6', labelPt: 'Rosado' },
  { hex: '#f7c1da', labelPt: 'Rosa' },
  { hex: '#e3aed6', labelPt: 'Lilás' },
  { hex: '#c3a0e0', labelPt: 'Uva' },
  { hex: '#a9d6e8', labelPt: 'Céu' },
  { hex: '#8fc7d4', labelPt: 'Água' },
  { hex: '#a6d8b9', labelPt: 'Menta' },
  { hex: '#bfe3a0', labelPt: 'Verde-limão' },
  { hex: '#f6e2a6', labelPt: 'Manteiga' },
  { hex: '#5f8aa6', labelPt: 'Jeans' },
]

// ── Presets de tema (bundle de aparência: paredes + piso + luz) ───────────────
// O tema é um atalho "fica bonito": dá uma aparência coordenada de graça (a posse é
// do tema). Pisos/luzes avulsos pagos permitem misturar. Render usa estes defaults
// quando o estado não traz override explícito (quartos legados só-`theme` ok).
export interface ThemePreset {
  wallColors: { left: string; right: string }
  floor: string
  lighting: string
}
export const THEME_PRESETS: Record<string, ThemePreset> = {
  aconchego: {
    wallColors: { left: '#f7c9a6', right: '#f9d9c6' },
    floor: 'piso-madeira-clara',
    lighting: 'dia',
  },
  floresta: {
    wallColors: { left: '#a6d8b9', right: '#bfe3a0' },
    floor: 'piso-madeira-escura',
    lighting: 'dia',
  },
  oceano: {
    wallColors: { left: '#a9d6e8', right: '#8fc7d4' },
    floor: 'piso-ladrilho',
    lighting: 'dia',
  },
  espaco: {
    wallColors: { left: '#5f8aa6', right: '#c3a0e0' },
    floor: 'piso-madeira-escura',
    lighting: 'noite',
  },
  doce: {
    wallColors: { left: '#f7c1da', right: '#e3aed6' },
    floor: 'piso-tapete',
    lighting: 'dia',
  },
}
const FALLBACK_THEME_PRESET: ThemePreset = {
  wallColors: { left: '#f7c9a6', right: '#f9d9c6' },
  floor: 'piso-madeira-clara',
  lighting: 'dia',
}
export function themePreset(id: string): ThemePreset {
  return THEME_PRESETS[id] ?? THEME_PRESETS.aconchego ?? FALLBACK_THEME_PRESET
}

/** Aparência EFETIVA do quarto: mistura o preset do tema com os overrides do estado. */
export function resolveRoomAppearance(state: {
  theme: string
  wallColors?: { left?: string; right?: string }
  floor?: string
  lighting?: string
}): { left: string; right: string; floorId: string; lightingId: string } {
  const preset = themePreset(state.theme)
  return {
    left: state.wallColors?.left ?? preset.wallColors.left,
    right: state.wallColors?.right ?? preset.wallColors.right,
    floorId: state.floor ?? preset.floor,
    lightingId: state.lighting ?? preset.lighting,
  }
}

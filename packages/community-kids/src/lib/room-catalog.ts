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
  /** `'wall'` = item de PAREDE (espelha o members; o renderer o pendura na parede, na altura). */
  mount?: 'wall'
  /** SUPERFÍCIE (24/07): nº de NICHOS em cima (espelha o members; offsets em SURFACE_SLOTS). */
  surface?: number
  /** Item pequeno que pode ir EM CIMA de uma superfície (espelha o members). */
  stackable?: boolean
  /** Classe de animação CSS legada (sem uso no renderer 3D — tolerada). */
  anim?: 'kid-room-grow' | 'kid-room-float' | 'kid-room-twinkle' | 'kid-room-flicker'
}

export const ROOM_ITEM_INFO: Record<string, RoomItemInfo> = {
  // Móveis (chão)
  cama: { labelPt: 'Cama', emoji: '🛏️', w: 2, h: 3 },
  cadeira: { labelPt: 'Cadeira', emoji: '🪑', w: 1, h: 2 },
  mesa: { labelPt: 'Mesa', emoji: '🍽️', w: 2, h: 2, surface: 2 },
  sofa: { labelPt: 'Sofá', emoji: '🛋️', w: 3, h: 2 },
  estante: { labelPt: 'Estante', emoji: '📚', w: 2, h: 3, surface: 3 },
  bau: { labelPt: 'Baú', emoji: '🧰', w: 2, h: 2 },
  'mesa-estudo': { labelPt: 'Escrivaninha', emoji: '📝', w: 2, h: 1, surface: 1 },
  tv: { labelPt: 'TV', emoji: '📺', w: 2, h: 1 },
  beliche: { labelPt: 'Beliche', emoji: '🛌', w: 2, h: 3 },
  pufe: { labelPt: 'Pufe', emoji: '💺', w: 1, h: 1 },
  // Decoração de chão
  ursinho: { labelPt: 'Ursinho', emoji: '🧸', w: 1, h: 1, stackable: true },
  balao: { labelPt: 'Balão', emoji: '🎈', w: 1, h: 2 },
  bandeira: { labelPt: 'Bandeira', emoji: '🚩', w: 1, h: 2 },
  globo: { labelPt: 'Globo', emoji: '🌍', w: 1, h: 1, stackable: true },
  guitarra: { labelPt: 'Guitarra', emoji: '🎸', w: 1, h: 2 },
  bola: { labelPt: 'Bola', emoji: '⚽', w: 1, h: 1, stackable: true },
  // Decoração de PAREDE (mount: 'wall' — sobe na parede)
  quadro: { labelPt: 'Quadro', emoji: '🖼️', w: 2, h: 2, mount: 'wall' },
  estrela: { labelPt: 'Estrela', emoji: '⭐', w: 1, h: 1, mount: 'wall' },
  janela: { labelPt: 'Janela', emoji: '🪟', w: 2, h: 2, mount: 'wall' },
  relogio: { labelPt: 'Relógio', emoji: '🕐', w: 1, h: 1, mount: 'wall' },
  prateleira: { labelPt: 'Prateleira', emoji: '🗄️', w: 2, h: 1, mount: 'wall' },
  poster: { labelPt: 'Pôster', emoji: '🏞️', w: 1, h: 2, mount: 'wall' },
  espelho: { labelPt: 'Espelho', emoji: '🪞', w: 1, h: 2, mount: 'wall' },
  // Plantas
  planta: { labelPt: 'Planta', emoji: '🪴', w: 1, h: 2 },
  arvore: { labelPt: 'Árvore', emoji: '🌳', w: 2, h: 3 },
  // Luzes
  luminaria: { labelPt: 'Luminária', emoji: '💡', w: 1, h: 2 },
  vela: { labelPt: 'Vela', emoji: '🕯️', w: 1, h: 1, stackable: true },
  // Pets (campo `pet`)
  'pet-gato': { labelPt: 'Gato', emoji: '🐱', w: 1, h: 1 },
  'pet-cachorro': { labelPt: 'Cachorro', emoji: '🐶', w: 1, h: 1 },
  'pet-passaro': { labelPt: 'Passarinho', emoji: '🐦', w: 1, h: 1 },
  // 🏆 Troféus (07/2026) — ganhos por conquista, nunca comprados (tier 'trophy').
  // Os de CHÃO são `stackable` (podem ir na mesa/estante — espelha o members).
  'trofeu-primeiro-jogo': {
    labelPt: 'Troféu do 1º Jogo',
    emoji: '🏆',
    w: 1,
    h: 1,
    stackable: true,
  },
  'trofeu-diploma': { labelPt: 'Diploma na Parede', emoji: '📜', w: 1, h: 1, mount: 'wall' },
  'trofeu-chama': { labelPt: 'Chama dos 30 Dias', emoji: '🔥', w: 1, h: 1, stackable: true },
  'trofeu-medalha-mil': { labelPt: 'Medalha Nota Mil', emoji: '🥇', w: 1, h: 1, mount: 'wall' },
  'trofeu-foguete': { labelPt: 'Foguete do Lançamento', emoji: '🚀', w: 1, h: 2, stackable: true },
  'trofeu-console': { labelPt: 'Console de Criador', emoji: '🕹️', w: 1, h: 1, stackable: true },
  'trofeu-estrela-do-mural': {
    labelPt: 'Estrela do Mural',
    emoji: '🌟',
    w: 1,
    h: 1,
    stackable: true,
  },
  // 🏆 Estante de Troféus (24/07) — vem de graça com o 1º troféu (não tem badge própria).
  'estante-trofeus': { labelPt: 'Estante de Troféus', emoji: '🏅', w: 3, h: 2, surface: 6 },
}

/** Concedida junto com o 1º troféu (espelha `TROPHY_SHELF_ITEM_ID` do members). */
export const TROPHY_SHELF_ITEM_ID = 'estante-trofeus'

/**
 * Como GANHAR cada troféu (dica exibida na bandeja 🏆 quando ainda travado).
 * Espelha o `TROPHY_FOR_BADGE` do members — a conquista é a badge mapeada.
 */
export const TROPHY_HINT: Record<string, string> = {
  'trofeu-primeiro-jogo': 'Publique o seu primeiro jogo no Mural!',
  'trofeu-diploma': 'Complete um curso inteirinho!',
  'trofeu-chama': 'Faça uma sequência de 30 dias!',
  'trofeu-medalha-mil': 'Tire nota mil em 10 quizzes!',
  'trofeu-foguete': 'Lance a Versão 1 de um plano no Pensa!',
  'trofeu-console': 'Complete 3 atividades do Estúdio com nota!',
  'trofeu-estrela-do-mural': 'Tenha um jogo seu jogado 100 vezes!',
  'estante-trofeus': 'Ganhe o seu primeiro troféu e a estante vem junto!',
}

// ── Superfícies (24/07): offsets 3D dos NICHOS por item — unidades de mundo, relativos ao
// CENTRO do móvel (os filhos renderizam DENTRO do grupo do pai e herdam posição/rotação).
// O nº de slots TEM que casar com `surface` do members (travado na conformância).
export interface SurfaceSlot {
  x: number
  y: number
  z: number
}
export const SURFACE_SLOTS: Record<string, readonly SurfaceSlot[]> = {
  // Tampo da mesa (topo ≈ y 0.81) — 2 nichos lado a lado.
  mesa: [
    { x: -0.5, y: 0.81, z: 0 },
    { x: 0.5, y: 0.81, z: 0 },
  ],
  // Escrivaninha: 1 nicho na ponta livre do tampo (o monitor mora na esquerda).
  'mesa-estudo': [{ x: 0.56, y: 0.84, z: 0 }],
  // Estante: topo das 3 prateleiras (s1 tem livros à esquerda → nicho à direita).
  estante: [
    { x: 0.5, y: 0.76, z: 0.1 },
    { x: 0, y: 1.44, z: 0.1 },
    { x: 0, y: 2.1, z: 0.1 },
  ],
  // Estante de Troféus: 6 nichos em 2 fileiras × 3 colunas (pisos: base 0.2, prateleira 1.24).
  'estante-trofeus': [
    { x: -0.92, y: 0.2, z: 0.06 },
    { x: 0, y: 0.2, z: 0.06 },
    { x: 0.92, y: 0.2, z: 0.06 },
    { x: -0.92, y: 1.24, z: 0.06 },
    { x: 0, y: 1.24, z: 0.06 },
    { x: 0.92, y: 1.24, z: 0.06 },
  ],
}

/** Escala dos filhos num nicho (versão "de estante" menor que a de chão). */
export const SURFACE_CHILD_SCALE = 0.72

/**
 * Badges que CONCEDEM troféu (espelha as chaves do `TROPHY_FOR_BADGE` do members) —
 * a celebração usa p/ avisar "tem troféu novo no seu quarto!".
 */
export const TROPHY_BADGE_SLUGS: ReadonlySet<string> = new Set([
  'first-showcase',
  'course-complete',
  'streak-30',
  'quiz-perfect-10',
  'pensa-first-launch',
  'studio-master-3',
  'plays-100',
])

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

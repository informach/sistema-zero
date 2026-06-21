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
  cama: { labelPt: 'Cama', emoji: '🛏️', w: 3, h: 2 },
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

/** Tema escuro (espaço) → texto/UI clara por cima. */
export function isDarkTheme(themeId: string): boolean {
  return themeId === 'espaco'
}

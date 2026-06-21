/**
 * Catálogo do QUARTO VIRTUAL (móveis/decoração/pets/temas) EM CÓDIGO — mesmo padrão
 * do avatar/badges (prod roda só `db:migrate`, sem seed; o catálogo muda junto com o
 * código). O members é a fonte da verdade de "existe + custa + possui"; a APRESENTAÇÃO
 * (rótulo PT + emoji + animação) vive no app kids (`lib/room-catalog.ts`), chaveada
 * pelo MESMO `id`. Itens/temas são SINKS das moedas Zappy (cosmético puro).
 */

export type RoomItemCategory = 'furniture' | 'decor' | 'plant' | 'light' | 'pet'

export interface RoomItemDef {
  id: string
  category: RoomItemCategory
  tier: 'free' | 'coins'
  price: number
  /** Largura/altura em células da grade (p/ validar limites de posição). */
  w: number
  h: number
}

export interface RoomThemeDef {
  id: string
  tier: 'free' | 'coins'
  price: number
}

/** Grade do quarto (colunas × linhas). Itens ocupam `w×h` células. */
export const ROOM_GRID = { cols: 12, rows: 8 } as const
/** Teto de itens posicionados (anti-abuso/perf). */
export const ROOM_MAX_PLACED = 40
export const DEFAULT_ROOM_THEME = 'aconchego'

const item = (
  id: string,
  category: RoomItemCategory,
  price: number,
  w: number,
  h: number,
): RoomItemDef => ({ id, category, tier: price === 0 ? 'free' : 'coins', price, w, h })

export const ROOM_ITEMS: readonly RoomItemDef[] = [
  // Móveis
  item('cama', 'furniture', 0, 2, 3), // cama de SOLTEIRO (estreita 2 × comprida 3)
  item('cadeira', 'furniture', 0, 1, 2),
  item('sofa', 'furniture', 80, 3, 2),
  item('estante', 'furniture', 70, 2, 3),
  item('bau', 'furniture', 90, 2, 2),
  // Decoração
  item('quadro', 'decor', 0, 2, 2),
  item('estrela', 'decor', 0, 1, 1),
  item('janela', 'decor', 60, 2, 2),
  item('bandeira', 'decor', 50, 1, 2),
  item('ursinho', 'decor', 70, 1, 1),
  item('balao', 'decor', 50, 1, 2),
  item('relogio', 'decor', 60, 1, 1),
  // Plantas (animadas)
  item('planta', 'plant', 80, 1, 2),
  item('arvore', 'plant', 130, 2, 3),
  // Luzes (animadas)
  item('luminaria', 'light', 70, 1, 2),
  item('vela', 'light', 60, 1, 1),
  // Pets (animados) — um pet por quarto (campo `pet` do estado)
  item('pet-gato', 'pet', 300, 1, 1),
  item('pet-cachorro', 'pet', 300, 1, 1),
  item('pet-passaro', 'pet', 250, 1, 1),
]

export const ROOM_ITEMS_BY_ID: ReadonlyMap<string, RoomItemDef> = new Map(
  ROOM_ITEMS.map((i) => [i.id, i]),
)

export const ROOM_THEMES: readonly RoomThemeDef[] = [
  { id: 'aconchego', tier: 'free', price: 0 },
  { id: 'floresta', tier: 'coins', price: 200 },
  { id: 'oceano', tier: 'coins', price: 250 },
  { id: 'espaco', tier: 'coins', price: 300 },
  { id: 'doce', tier: 'coins', price: 200 },
]

export const ROOM_THEMES_BY_ID: ReadonlyMap<string, RoomThemeDef> = new Map(
  ROOM_THEMES.map((t) => [t.id, t]),
)

/**
 * Pisos — categoria À PARTE (como os temas): id no campo `floor` do estado, NÃO vão na
 * grade. `piso-madeira-clara` é o default grátis; os demais são sinks de moedas Zappy.
 * Reusa o shape `RoomThemeDef` ({id, tier, price}).
 */
export const ROOM_FLOORS: readonly RoomThemeDef[] = [
  { id: 'piso-madeira-clara', tier: 'free', price: 0 },
  { id: 'piso-madeira-escura', tier: 'coins', price: 60 },
  { id: 'piso-tapete', tier: 'coins', price: 80 },
  { id: 'piso-xadrez', tier: 'coins', price: 70 },
  { id: 'piso-ladrilho', tier: 'coins', price: 70 },
]
export const ROOM_FLOORS_BY_ID: ReadonlyMap<string, RoomThemeDef> = new Map(
  ROOM_FLOORS.map((f) => [f.id, f]),
)
export const DEFAULT_ROOM_FLOOR = 'piso-madeira-clara'

/**
 * Iluminação/clima — categoria À PARTE: id no campo `lighting` do estado, fora da grade.
 * `dia` é o default grátis; tarde/noite/neon/festa são sinks de moedas. Cada id mapeia
 * parâmetros de luz/fundo na APRESENTAÇÃO do kids (`LIGHTING_PRESETS`).
 */
export const ROOM_LIGHTINGS: readonly RoomThemeDef[] = [
  { id: 'dia', tier: 'free', price: 0 },
  { id: 'tarde', tier: 'coins', price: 60 },
  { id: 'noite', tier: 'coins', price: 80 },
  { id: 'neon-rosa', tier: 'coins', price: 90 },
  { id: 'neon-ciano', tier: 'coins', price: 90 },
  { id: 'festa', tier: 'coins', price: 150 },
]
export const ROOM_LIGHTINGS_BY_ID: ReadonlyMap<string, RoomThemeDef> = new Map(
  ROOM_LIGHTINGS.map((l) => [l.id, l]),
)
export const DEFAULT_ROOM_LIGHTING = 'dia'

/**
 * Paleta CURADA de cores de parede. Pintar é GRÁTIS e irrestrito (a economia Zappy fica
 * em móveis/pisos/luzes); a paleta garante "sempre fica bonito" + identidade de marca.
 * Hex MINÚSCULO; o kids espelha estas mesmas cores em `lib/room-catalog.ts` (travado pelo
 * teste de conformância). `canonicalizeRoomState` descarta cor fora desta lista.
 */
export const ROOM_WALL_PALETTE: readonly string[] = [
  '#f3ede1',
  '#e7dccb',
  '#d6ccbb',
  '#cdd6da',
  '#aab7be',
  '#f7c9a6',
  '#f0a884',
  '#e0796a',
  '#f9d9c6',
  '#f7c1da',
  '#e3aed6',
  '#c3a0e0',
  '#a9d6e8',
  '#8fc7d4',
  '#a6d8b9',
  '#bfe3a0',
  '#f6e2a6',
  '#5f8aa6',
]
const ROOM_WALL_PALETTE_SET: ReadonlySet<string> = new Set(ROOM_WALL_PALETTE)

export interface PlacedItem {
  itemId: string
  x: number
  y: number
  /** Rotação em quartos de volta (0=0°, 1=90°, 2=180°, 3=270°). Ausente = 0. */
  rot?: 0 | 1 | 2 | 3
}

/** Cor de cada parede do recorte em "L" (hex da paleta). Lado ausente = default do tema. */
export interface WallColors {
  left?: string
  right?: string
}

export interface RoomState {
  theme: string
  placedItems: PlacedItem[]
  /** Pet ativo (itemId de categoria `pet`) ou `null`. */
  pet: string | null
  /** Cor das paredes (pintar) — lados ausentes caem no default do tema. */
  wallColors?: WallColors
  /** Piso escolhido (id de ROOM_FLOORS) — ausente = default do tema. */
  floor?: string
  /** Preset de iluminação/clima (id de ROOM_LIGHTINGS) — ausente = `dia`. */
  lighting?: string
}

/** Quarto vazio inicial (tema grátis, sem itens). Determinístico. */
export function defaultRoomState(): RoomState {
  return { theme: DEFAULT_ROOM_THEME, placedItems: [], pet: null }
}

/** Item/tema é grátis OU está possuído (free é implicitamente possuído). */
function isOwnedItem(itemId: string, owned: ReadonlySet<string>): boolean {
  const def = ROOM_ITEMS_BY_ID.get(itemId)
  return def !== undefined && (def.tier === 'free' || owned.has(itemId))
}
function isOwnedTheme(themeId: string, owned: ReadonlySet<string>): boolean {
  const def = ROOM_THEMES_BY_ID.get(themeId)
  return def !== undefined && (def.tier === 'free' || owned.has(themeId))
}
/** Escolha de catálogo à parte (piso/iluminação) é grátis OU possuída? */
function isOwnedChoice(
  id: string,
  byId: ReadonlyMap<string, RoomThemeDef>,
  owned: ReadonlySet<string>,
): boolean {
  const def = byId.get(id)
  return def !== undefined && (def.tier === 'free' || owned.has(id))
}

/** Rotação válida (quarto de volta) — qualquer outra coisa vira 0. */
function normalizeRot(rot: unknown): 0 | 1 | 2 | 3 {
  return rot === 1 || rot === 2 || rot === 3 ? rot : 0
}

/** Footprint EFETIVO: 90°/270° trocam largura×altura (validar limites e desenhar). */
export function effectiveFootprint(
  def: { w: number; h: number },
  rot: 0 | 1 | 2 | 3,
): { w: number; h: number } {
  return rot === 1 || rot === 3 ? { w: def.h, h: def.w } : { w: def.w, h: def.h }
}

/** Posição cabe na grade considerando a rotação (origem ≥ 0, w×h dentro de cols×rows)? */
function withinBounds(def: RoomItemDef, x: number, y: number, rot: 0 | 1 | 2 | 3): boolean {
  const fp = effectiveFootprint(def, rot)
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x + fp.w <= ROOM_GRID.cols &&
    y + fp.h <= ROOM_GRID.rows
  )
}

/** Cor de parede válida = hex (minúsculo) presente na paleta curada; senão `undefined`. */
function validWallColor(c: unknown): string | undefined {
  if (typeof c !== 'string') return undefined
  const lower = c.toLowerCase()
  return ROOM_WALL_PALETTE_SET.has(lower) ? lower : undefined
}

/**
 * Normaliza o estado do quarto para PERSISTÊNCIA/RENDER (tolerante, forward-compat):
 * descarta tema/item/pet/piso/luz desconhecido OU não possuído, descarta posição fora da
 * grade (considerando a rotação) e cor de parede fora da paleta, limita ao teto. `owned` =
 * inventário (peças pagas; grátis são implícitas). Campos novos são OMITIDOS quando
 * ausentes/inválidos → o render cai no default do tema (quartos legados seguem válidos).
 */
export function canonicalizeRoomState(
  raw: RoomState | null,
  owned: ReadonlySet<string>,
): RoomState {
  const theme = raw && isOwnedTheme(raw.theme, owned) ? raw.theme : DEFAULT_ROOM_THEME
  const placedItems: PlacedItem[] = []
  for (const p of raw?.placedItems ?? []) {
    if (placedItems.length >= ROOM_MAX_PLACED) break
    const def = ROOM_ITEMS_BY_ID.get(p?.itemId)
    // Pets/piso/luz não vão na grade; só móveis/decoração/planta/luz-objeto.
    if (!def || def.category === 'pet') continue
    if (!isOwnedItem(p.itemId, owned)) continue
    const rot = normalizeRot(p.rot)
    if (!withinBounds(def, p.x, p.y, rot)) continue
    placedItems.push(
      rot === 0 ? { itemId: p.itemId, x: p.x, y: p.y } : { itemId: p.itemId, x: p.x, y: p.y, rot },
    )
  }
  const pet =
    raw?.pet && ROOM_ITEMS_BY_ID.get(raw.pet)?.category === 'pet' && isOwnedItem(raw.pet, owned)
      ? raw.pet
      : null

  // Paredes: cada lado validado contra a paleta (cor inválida = lado omitido).
  const left = validWallColor(raw?.wallColors?.left)
  const right = validWallColor(raw?.wallColors?.right)
  const wallColors: WallColors | undefined =
    left || right ? { ...(left ? { left } : {}), ...(right ? { right } : {}) } : undefined
  const floor =
    raw?.floor && isOwnedChoice(raw.floor, ROOM_FLOORS_BY_ID, owned) ? raw.floor : undefined
  const lighting =
    raw?.lighting && isOwnedChoice(raw.lighting, ROOM_LIGHTINGS_BY_ID, owned)
      ? raw.lighting
      : undefined

  const state: RoomState = { theme, placedItems, pet }
  if (wallColors) state.wallColors = wallColors
  if (floor) state.floor = floor
  if (lighting) state.lighting = lighting
  return state
}

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
  item('cama', 'furniture', 0, 3, 2),
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

export interface PlacedItem {
  itemId: string
  x: number
  y: number
}

export interface RoomState {
  theme: string
  placedItems: PlacedItem[]
  /** Pet ativo (itemId de categoria `pet`) ou `null`. */
  pet: string | null
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

/** Posição cabe na grade (item `w×h` dentro de cols×rows, origem ≥ 0)? */
function withinBounds(def: RoomItemDef, x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x + def.w <= ROOM_GRID.cols &&
    y + def.h <= ROOM_GRID.rows
  )
}

/**
 * Normaliza o estado do quarto para PERSISTÊNCIA/RENDER (tolerante, forward-compat):
 * descarta tema/item/pet desconhecido OU não possuído, descarta posição fora da grade,
 * limita ao teto. `owned` = inventário (peças pagas; grátis são implícitas).
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
    // Pets não vão na grade (têm o campo `pet`); só categorias "de chão/parede".
    if (!def || def.category === 'pet') continue
    if (!isOwnedItem(p.itemId, owned)) continue
    if (!withinBounds(def, p.x, p.y)) continue
    placedItems.push({ itemId: p.itemId, x: p.x, y: p.y })
  }
  const pet =
    raw?.pet && ROOM_ITEMS_BY_ID.get(raw.pet)?.category === 'pet' && isOwnedItem(raw.pet, owned)
      ? raw.pet
      : null
  return { theme, placedItems, pet }
}

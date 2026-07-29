/**
 * Catálogo do QUARTO VIRTUAL (móveis/decoração/pets/temas) EM CÓDIGO — mesmo padrão
 * do avatar/badges (prod roda só `db:migrate`, sem seed; o catálogo muda junto com o
 * código). O members é a fonte da verdade de "existe + custa + possui"; a APRESENTAÇÃO
 * (rótulo PT + emoji + animação) vive no app kids (`lib/room-catalog.ts`), chaveada
 * pelo MESMO `id`. Itens/temas são SINKS das moedas Zappy (cosmético puro).
 */

import type { BadgeSlug } from '../gamification/badges'

export type RoomItemCategory = 'furniture' | 'decor' | 'plant' | 'light' | 'pet'

export interface RoomItemDef {
  id: string
  category: RoomItemCategory
  /**
   * `free` = todo mundo possui; `coins` = comprável com Zappy; `trophy` (07/2026) =
   * NÃO-comprável, GANHO por conquista (o award concede via `room_inventory` quando a
   * badge mapeada em `TROPHY_FOR_BADGE` destrava). Trophy exige inventário p/ possuir
   * (nunca `free`, senão todos teriam).
   */
  tier: 'free' | 'coins' | 'trophy'
  price: number
  /** Largura/altura em células. Item de chão: w×h no piso. Item de PAREDE: w=horizontal, h=ALTURA. */
  w: number
  h: number
  /** `'wall'` = item de PAREDE (sobe na parede via campo `wall` do estado); ausente = item de chão. */
  mount?: 'wall'
  /**
   * SUPERFÍCIE (24/07): nº de NICHOS em cima do móvel — itens `stackable` entram neles
   * (1 por nicho, via `PlacedItem.on`/`slot`). Ausente = não é superfície.
   */
  surface?: number
  /** Item PEQUENO que pode ser colocado EM CIMA de uma superfície (troféus de chão + decor 1×1). */
  stackable?: boolean
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

/** Altura útil das paredes em células (itens de parede sobem até aqui). */
export const WALL_H_CELLS = 4
/** Comprimento horizontal de cada parede em células (left = linhas, right = colunas). */
function wallLength(wall: 'left' | 'right'): number {
  return wall === 'left' ? ROOM_GRID.rows : ROOM_GRID.cols
}

const item = (
  id: string,
  category: RoomItemCategory,
  price: number,
  w: number,
  h: number,
  opts?: Pick<RoomItemDef, 'mount' | 'surface' | 'stackable'>,
): RoomItemDef => ({
  id,
  category,
  tier: price === 0 ? 'free' : 'coins',
  price,
  w,
  h,
  ...opts,
})

/**
 * Troféu: decoração NÃO-comprável, concedida por conquista (preço 0, tier próprio).
 * Troféu de CHÃO é `stackable` (vai na mesa/estante); o de parede não.
 */
const trophy = (id: string, w: number, h: number, mount?: 'wall'): RoomItemDef => ({
  id,
  category: 'decor',
  tier: 'trophy',
  price: 0,
  w,
  h,
  ...(mount ? { mount } : { stackable: true }),
})

export const ROOM_ITEMS: readonly RoomItemDef[] = [
  // Móveis (chão)
  item('cama', 'furniture', 0, 2, 3), // cama de SOLTEIRO (estreita 2 × comprida 3)
  item('cadeira', 'furniture', 0, 1, 2),
  item('mesa', 'furniture', 0, 2, 2, { surface: 2 }),
  item('sofa', 'furniture', 80, 3, 2),
  item('estante', 'furniture', 70, 2, 3, { surface: 3 }),
  item('bau', 'furniture', 90, 2, 2),
  item('mesa-estudo', 'furniture', 70, 2, 1, { surface: 1 }),
  item('tv', 'furniture', 90, 2, 1),
  item('beliche', 'furniture', 120, 2, 3),
  item('pufe', 'furniture', 50, 1, 1),
  // Decoração de CHÃO (as 1×1 pequenas são `stackable` — vão na mesa/estante também)
  item('ursinho', 'decor', 70, 1, 1, { stackable: true }),
  item('balao', 'decor', 50, 1, 2),
  item('bandeira', 'decor', 50, 1, 2),
  item('globo', 'decor', 50, 1, 1, { stackable: true }),
  item('guitarra', 'decor', 80, 1, 2),
  item('bola', 'decor', 0, 1, 1, { stackable: true }),
  // Decoração de PAREDE (`mount: 'wall'` — w = horizontal, h = altura na parede)
  item('quadro', 'decor', 0, 2, 2, { mount: 'wall' }),
  item('estrela', 'decor', 0, 1, 1, { mount: 'wall' }),
  item('janela', 'decor', 60, 2, 2, { mount: 'wall' }),
  item('relogio', 'decor', 60, 1, 1, { mount: 'wall' }),
  item('prateleira', 'decor', 60, 2, 1, { mount: 'wall' }),
  item('poster', 'decor', 50, 1, 2, { mount: 'wall' }),
  item('espelho', 'decor', 60, 1, 2, { mount: 'wall' }),
  // Plantas (animadas)
  item('planta', 'plant', 80, 1, 2),
  item('arvore', 'plant', 130, 2, 3),
  // Luzes (animadas)
  item('luminaria', 'light', 70, 1, 2),
  item('vela', 'light', 60, 1, 1, { stackable: true }),
  // Pets (animados) — um pet por quarto (campo `pet` do estado)
  item('pet-gato', 'pet', 300, 1, 1),
  item('pet-cachorro', 'pet', 300, 1, 1),
  item('pet-passaro', 'pet', 250, 1, 1),
  // 🏆 TROFÉUS (07/2026) — a "estante de troféus viva": concedidos por CONQUISTA
  // (nunca compráveis; mapa badge→troféu em TROPHY_FOR_BADGE). Os 4 primeiros são
  // UNIVERSAIS (todo comprador de curso alcança); os 2 últimos são bônus de produto.
  trophy('trofeu-primeiro-jogo', 1, 1), // 1º jogo publicado no Mural (first-showcase)
  trophy('trofeu-diploma', 1, 1, 'wall'), // 1º curso 100% (course-complete)
  trophy('trofeu-chama', 1, 1), // streak de 30 dias (streak-30)
  trophy('trofeu-medalha-mil', 1, 1, 'wall'), // 10 quizzes nota mil (quiz-perfect-10)
  trophy('trofeu-foguete', 1, 2), // 1º ciclo ZERO lançado (pensa-first-launch — bônus Pensa)
  trophy('trofeu-console', 1, 1), // 3 atividades do Estúdio aprovadas (studio-master-3 — bônus)
  trophy('trofeu-estrela-do-mural', 1, 1), // um jogo seu foi jogado 100× (plays-100 — universal)
  // 🏆 ESTANTE DE TROFÉUS (24/07): móvel NÃO-comprável concedido junto com o 1º troféu
  // (o award insere no `room_inventory` na mesma tx). 6 nichos p/ exibir a coleção.
  {
    id: 'estante-trofeus',
    category: 'furniture',
    tier: 'trophy',
    price: 0,
    w: 3,
    h: 2,
    surface: 6,
  },
]

/** Concedida automaticamente com o PRIMEIRO troféu (award, mesma tx, idempotente). */
export const TROPHY_SHELF_ITEM_ID = 'estante-trofeus'

export const ROOM_ITEMS_BY_ID: ReadonlyMap<string, RoomItemDef> = new Map(
  ROOM_ITEMS.map((i) => [i.id, i]),
)

/**
 * Badge → troféu do quarto (07/2026): quando a badge DESTRAVA, o award concede o
 * item na MESMA transação (insere em `room_inventory`, idempotente). Badge sem
 * entrada = sem troféu. Manter os ids em sincronia com os `trophy(...)` acima.
 */
export const TROPHY_FOR_BADGE: Readonly<Partial<Record<BadgeSlug, string>>> = {
  'first-showcase': 'trofeu-primeiro-jogo',
  'course-complete': 'trofeu-diploma',
  'streak-30': 'trofeu-chama',
  'quiz-perfect-10': 'trofeu-medalha-mil',
  'pensa-first-launch': 'trofeu-foguete',
  'studio-master-3': 'trofeu-console',
  'plays-100': 'trofeu-estrela-do-mural',
}

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
  /** Chão: coluna. Parede (`wall` setado): posição HORIZONTAL ao longo da parede. */
  x: number
  /** Chão: linha. Parede: ALTURA (nível vertical) na parede. */
  y: number
  /** Rotação em quartos de volta (0=0°, 1=90°, 2=180°, 3=270°). Ausente = 0. Só item de chão. */
  rot?: 0 | 1 | 2 | 3
  /** Item de PAREDE (`def.mount==='wall'`): em qual parede está. Ausente = item de chão. */
  wall?: 'left' | 'right'
  /**
   * EM CIMA de uma superfície (24/07): itemId do PAI posicionado (`def.surface`). Com `on`,
   * o item ocupa um NICHO do pai (não células do chão) e x/y são ignorados (canônico 0,0).
   */
  on?: string
  /** Nicho da superfície do pai (0-based, < `surface` do pai). Presente sempre que `on` está. */
  slot?: number
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
 * Marca as células do footprint (x,y,w,h) no `set` (com `prefix`). Retorna `true` se JÁ HAVIA
 * sobreposição (não marca nesse caso) — base da colisão "nada por cima de nada".
 */
function occupies(
  set: Set<string>,
  prefix: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const claim: string[] = []
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      const k = `${prefix}${x + dx},${y + dy}`
      if (set.has(k)) return true
      claim.push(k)
    }
  }
  for (const k of claim) set.add(k)
  return false
}

/**
 * Normaliza o estado do quarto para PERSISTÊNCIA/RENDER (tolerante, forward-compat):
 * descarta tema/item/pet/piso/luz desconhecido OU não possuído, descarta posição fora da
 * grade (considerando a rotação) e cor de parede fora da paleta, limita ao teto. `owned` =
 * inventário (peças pagas; grátis são implícitas). Campos novos são OMITIDOS quando
 * ausentes/inválidos → o render cai no default do tema (quartos legados seguem válidos).
 * Filhos de SUPERFÍCIE (`on`/`slot`) validam numa 2ª passada contra os pais posicionados.
 */
export function canonicalizeRoomState(
  raw: RoomState | null,
  owned: ReadonlySet<string>,
): RoomState {
  const theme = raw && isOwnedTheme(raw.theme, owned) ? raw.theme : DEFAULT_ROOM_THEME
  const placedItems: PlacedItem[] = []
  const floorCells = new Set<string>() // "x,y" ocupadas no chão
  const wallCells = new Set<string>() // "left|right:u,v" ocupadas nas paredes
  // FILHOS de superfície (com `on`) validam DEPOIS — o pai precisa estar posicionado.
  // O teto da 1ª passada NÃO conta os filhos pendentes (podem cair na 2ª — um filho
  // inválido não deve "reservar" a vaga de um item de chão válido); a 2ª passada
  // re-aplica ROOM_MAX_PLACED, então o total nunca passa do teto.
  const children: PlacedItem[] = []
  for (const p of raw?.placedItems ?? []) {
    if (placedItems.length >= ROOM_MAX_PLACED) break
    const def = ROOM_ITEMS_BY_ID.get(p?.itemId)
    // Pets não vão na grade (campo `pet`); piso/luz são catálogos à parte.
    if (!def || def.category === 'pet') continue
    if (!isOwnedItem(p.itemId, owned)) continue

    if (typeof p.on === 'string') {
      if (def.stackable) children.push(p)
      continue
    }
    if (def.mount === 'wall') {
      // Item de PAREDE: x = horizontal, y = ALTURA. Valida limites + sem sobreposição na parede.
      const wall: 'left' | 'right' = p.wall === 'left' ? 'left' : 'right'
      if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) continue
      if (p.x < 0 || p.y < 0 || p.x + def.w > wallLength(wall) || p.y + def.h > WALL_H_CELLS)
        continue
      if (occupies(wallCells, `${wall}:`, p.x, p.y, def.w, def.h)) continue
      placedItems.push({ itemId: p.itemId, x: p.x, y: p.y, wall })
    } else {
      // Item de CHÃO: valida a grade (footprint girado) + sem sobreposição.
      const rot = normalizeRot(p.rot)
      if (!withinBounds(def, p.x, p.y, rot)) continue
      const fp = effectiveFootprint(def, rot)
      if (occupies(floorCells, '', p.x, p.y, fp.w, fp.h)) continue
      placedItems.push(
        rot === 0
          ? { itemId: p.itemId, x: p.x, y: p.y }
          : { itemId: p.itemId, x: p.x, y: p.y, rot },
      )
    }
  }
  // 2ª passada — filhos em superfícies: pai POSICIONADO no chão + nicho válido e livre
  // (1 filho por nicho). Filho NÃO ocupa célula (vive no nicho); pai inválido → colocação
  // descartada (a POSSE fica — o item volta pro tray). `on` ambíguo (mesmo pai colocado 2×)
  // resolve pro conjunto único de nichos do itemId (nichos são por PAI, não por instância).
  const surfaceSlots = new Set<string>() // "parentItemId:slot" ocupados
  for (const p of children) {
    if (placedItems.length >= ROOM_MAX_PLACED) break
    const parentDef = p.on ? ROOM_ITEMS_BY_ID.get(p.on) : undefined
    if (!parentDef?.surface) continue
    if (!placedItems.some((q) => q.itemId === p.on && q.on === undefined && !q.wall)) continue
    const slot = p.slot
    if (!Number.isInteger(slot) || (slot as number) < 0 || (slot as number) >= parentDef.surface)
      continue
    const key = `${p.on}:${slot}`
    if (surfaceSlots.has(key)) continue
    surfaceSlots.add(key)
    placedItems.push({ itemId: p.itemId, x: 0, y: 0, on: p.on, slot })
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

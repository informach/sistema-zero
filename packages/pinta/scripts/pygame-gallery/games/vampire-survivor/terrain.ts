/**
 * Vampire Survivor: as peças do chão (32 px no Pinta, 64 no jogo). Cada peça nasce de um
 * descritor (`maps.ts`): terreno de grama ou areia nos quatro cantos e, por cima, o muro de
 * rocha ou o cordão de pedras com as suas ligações. Tudo é calculado por pixel com funções
 * contínuas entre peças vizinhas (a borda da grama, a linha do muro e as pedras repetem a cada
 * 32 px), então qualquer peça encosta na outra sem emenda.
 */
import { Px, random } from '../../pixel'

export const TILE = 32

const GRASS = ['#2a4f2c', '#3b6e30', '#4f8a35', '#68a63d', '#90c650'] as const
const SAND = ['#9c6c45', '#bf8d55', '#dcae6b', '#ebc685', '#f6dfab'] as const
const ROCK = ['#2a1b24', '#55372f', '#77503d', '#98694b', '#b88b62', '#d7b384'] as const
const FLOWER = {
  white: '#f3efe2',
  yellow: '#ffd23f',
  pink: '#e8678c',
  blue: '#7cc6f2',
  leaf: '#2c5a2c',
} as const

/** Hash inteiro estável → [0, 1). */
function hash(x: number, y: number, seed: number) {
  let h =
    (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
const wrap = (value: number) => ((value % TILE) + TILE) % TILE
/** Ruído que repete a cada peça (o chão liso emenda com ele mesmo). */
const tileNoise = (x: number, y: number, seed: number) => hash(wrap(x), wrap(y), seed)

// Terreno -------------------------------------------------------------------------------------

type Corners = readonly [number, number, number, number]

/** Quanto de grama há no ponto (≥ 0.5 = grama). Linear nas bordas: o vizinho concorda. */
function grassField(corners: Corners, x: number, y: number) {
  const u = Math.min(1, Math.max(0, (x + 0.5) / TILE))
  const v = Math.min(1, Math.max(0, (y + 0.5) / TILE))
  const [tl, tr, bl, br] = corners
  const base = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
  const wobble =
    0.11 * Math.sin(u * Math.PI * 4 + 1.1) +
    0.11 * Math.sin(v * Math.PI * 4 + 0.3) +
    0.06 * Math.sin((u - v) * Math.PI * 6)
  return base + wobble * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
}

function grassColor(x: number, y: number) {
  const n = tileNoise(x, y, 11)
  const blade = tileNoise(x, y, 12) < 0.045
  const tip = tileNoise(x, y + 1, 12) < 0.045
  if (blade) return GRASS[1]
  if (tip) return GRASS[3]
  if (n < 0.1) return GRASS[1]
  if (n > 0.9) return GRASS[3]
  return GRASS[2]
}

function sandColor(x: number, y: number) {
  const n = tileNoise(x, y, 21)
  if (n < 0.05) return SAND[1]
  if (n > 0.95) return SAND[4]
  if (n > 0.82) return SAND[3]
  // Ondinhas de vento: traços curtos e claros na diagonal.
  const ripple =
    tileNoise(Math.floor((x + y * 2) / 5), Math.floor(y / 4), 22) < 0.12 && (x + y * 2) % 5 < 3
  return ripple ? SAND[3] : SAND[2]
}

function terrain(corners: Corners): Px {
  const tile = new Px(TILE, TILE)
  const grass = (x: number, y: number) => grassField(corners, x, y) >= 0.5
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (grass(x, y)) {
        // A beirada da grama: escura onde encosta na areia, clara logo atrás (luz de cima).
        const edge = !grass(x, y + 1) || !grass(x + 1, y) || !grass(x - 1, y) || !grass(x, y - 1)
        const lip = !grass(x, y + 2)
        tile.set(
          x,
          y,
          edge ? GRASS[1] : lip ? GRASS[2] : !grass(x - 2, y - 2) ? GRASS[4] : grassColor(x, y),
        )
      } else {
        // A areia fica na sombra da grama que está acima ou à esquerda.
        const shade = grass(x, y - 1) || grass(x - 1, y - 1)
        const soft = grass(x, y - 2) || grass(x - 2, y - 1)
        tile.set(x, y, shade ? SAND[0] : soft ? SAND[1] : sandColor(x, y))
      }
    }
  return tile
}

// Muro de rocha e cordão de pedras -------------------------------------------------------------

type Links = string

const CORNERS: Record<string, [number, number]> = {
  ES: [TILE, TILE],
  SW: [0, TILE],
  NE: [TILE, 0],
  NW: [0, 0],
}

/**
 * Distância do ponto ao "osso" da peça: do centro até cada borda ligada. Uma curva (duas
 * ligações em ângulo) é um quarto de círculo em volta do canto, então os anéis saem redondos.
 */
function boneDistance(links: Links, x: number, y: number) {
  const c = TILE / 2
  const px = x + 0.5
  const py = y + 0.5
  const corner = CORNERS[links]
  if (corner) {
    const [kx, ky] = corner
    const dx = px - kx
    const dy = py - ky
    const inQuadrant = (kx === 0 ? dx >= 0 : dx <= 0) && (ky === 0 ? dy >= 0 : dy <= 0)
    if (inQuadrant) return Math.abs(Math.hypot(dx, dy) - c)
    // Fora do quarto de círculo, a linha segue reta para a peça vizinha.
    const vertical = Math.abs(px - c)
    const horizontal = Math.abs(py - c)
    const beyondX = kx === 0 ? px < 0 : px > TILE
    const beyondY = ky === 0 ? py < 0 : py > TILE
    if (beyondX && !beyondY) return horizontal
    if (beyondY && !beyondX) return vertical
    return Math.min(horizontal, vertical) + c
  }
  let best = Math.hypot(px - c, py - c)
  const far = TILE * 2
  for (const link of links) {
    const [ex, ey] =
      link === 'N' ? [c, -far] : link === 'S' ? [c, far] : link === 'E' ? [far, c] : [-far, c]
    const dx = ex - c
    const dy = ey - c
    const t = Math.max(0, Math.min(1, ((px - c) * dx + (py - c) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(px - (c + t * dx), py - (c + t * dy)))
  }
  return best
}

/** Pedras (células de Voronoi que repetem a cada peça): distância ao centro e à borda da pedra. */
function stones(x: number, y: number, size: number, seed: number) {
  const per = Math.round(TILE / size)
  const px = x + 0.5
  const py = y + 0.5
  const cx = Math.floor(px / size)
  const cy = Math.floor(py / size)
  let d1 = Infinity
  let d2 = Infinity
  let fx = 0
  let fy = 0
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i
      const gy = cy + j
      const wx = ((gx % per) + per) % per
      const wy = ((gy % per) + per) % per
      const ox = (gx + 0.2 + 0.6 * hash(wx, wy, seed)) * size
      const oy = (gy + 0.2 + 0.6 * hash(wx, wy, seed + 1)) * size
      const d = Math.hypot(px - ox, py - oy)
      if (d < d1) {
        d2 = d1
        d1 = d
        fx = ox
        fy = oy
      } else if (d < d2) d2 = d
    }
  return { d1, gap: d2 - d1, dx: (px - fx) / size, dy: (py - fy) / size }
}

interface RockStyle {
  half: number
  stone: number
  face: number
  seed: number
}
const WALL: RockStyle = { half: 12.5, stone: TILE / 3, face: 5, seed: 31 }
const RIDGE: RockStyle = { half: 5.2, stone: TILE / 4, face: 1, seed: 41 }

function rock(base: Px, links: Links, style: RockStyle, groundIsGrass: boolean): Px {
  const tile = base.clone()
  const inside = (x: number, y: number) => boneDistance(links, x, y) <= style.half
  const shadowFloor = groundIsGrass ? GRASS[0] : SAND[0]
  const shadowSoft = groundIsGrass ? GRASS[1] : SAND[1]
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (!inside(x, y)) {
        const d = boneDistance(links, x, y)
        if (d <= style.half + 1.1) tile.set(x, y, ROCK[0])
        else if (inside(x - 2, y - 3) || inside(x - 1, y - 2)) tile.set(x, y, shadowFloor)
        else if (inside(x - 3, y - 4)) tile.set(x, y, shadowSoft)
        continue
      }
      // A face da pedra virada para baixo (dá a altura do muro).
      let face = -1
      for (let k = 1; k <= style.face; k++)
        if (!inside(x, y + k)) {
          face = k
          break
        }
      if (face > 0) {
        tile.set(x, y, face === 1 ? ROCK[1] : (x + Math.floor(y / 2)) % 4 === 0 ? ROCK[1] : ROCK[2])
        continue
      }
      const s = stones(x, y, style.stone, style.seed)
      if (s.gap < 1.1) {
        tile.set(x, y, ROCK[1])
        continue
      }
      const light = -(s.dx + s.dy) * 1.2 + (tileNoise(x, y, style.seed + 7) - 0.5) * 0.35
      const top = !inside(x, y - 1) || !inside(x - 1, y)
      tile.set(
        x,
        y,
        top && light > -0.2
          ? ROCK[5]
          : light > 0.45
            ? ROCK[5]
            : light > 0.1
              ? ROCK[4]
              : light > -0.3
                ? ROCK[3]
                : ROCK[2],
      )
    }
  return tile
}

// Enfeites do chão liso ------------------------------------------------------------------------

function flower(tile: Px, x: number, y: number, petal: string) {
  tile
    .set(x, y - 1, petal)
    .set(x - 1, y, petal)
    .set(x + 1, y, petal)
    .set(x, y + 1, petal)
  tile.set(x, y, FLOWER.yellow === petal ? FLOWER.white : FLOWER.yellow)
  tile.set(x + 1, y + 1, FLOWER.leaf)
}

function grassVariant(kind: number): Px {
  const tile = terrain([1, 1, 1, 1])
  const rng = random(500 + kind)
  if (kind === 0) {
    // Flores.
    for (const [x, y] of [
      [6, 7],
      [21, 12],
      [11, 23],
      [26, 26],
    ] as const)
      flower(
        tile,
        x + rng.int(-1, 1),
        y + rng.int(-1, 1),
        rng.pick([FLOWER.white, FLOWER.pink, FLOWER.blue]),
      )
  } else if (kind === 1) {
    // Tufos de capim alto.
    for (const [cx, cy] of [
      [9, 12],
      [23, 22],
    ] as const)
      for (let i = -3; i <= 3; i++) {
        const h = 4 - Math.abs(i) + (i % 2 === 0 ? 1 : 0)
        for (let k = 0; k < h; k++)
          tile.set(cx + i, cy - k, k === h - 1 ? GRASS[4] : k === 0 ? GRASS[0] : GRASS[1])
      }
  } else {
    // Trevos e uma pedrinha.
    for (const [x, y] of [
      [8, 20],
      [24, 9],
    ] as const) {
      tile
        .rect(x - 1, y - 1, 2, 2, GRASS[3])
        .rect(x + 1, y - 1, 2, 2, GRASS[4])
        .rect(x, y + 1, 2, 2, GRASS[3])
      tile.set(x + 1, y + 3, GRASS[0])
    }
    tile.ellipse(17, 25, 5, 3, ROCK[3]).set(18, 25, ROCK[5]).rect(17, 28, 5, 1, GRASS[0])
  }
  return tile
}

function sandVariant(kind: number): Px {
  const tile = terrain([0, 0, 0, 0])
  if (kind === 0) {
    // Pedrinhas soltas.
    for (const [x, y, w] of [
      [7, 9, 4],
      [22, 20, 3],
      [12, 25, 2],
    ] as const) {
      tile.ellipse(x, y, w, w - 1, ROCK[3]).set(x + 1, y, ROCK[5])
      tile.rect(x + 1, y + w - 1, w, 1, SAND[0])
    }
  } else {
    // Concha e marcas de vento mais fundas.
    tile
      .ellipse(18, 8, 6, 5, FLOWER.white)
      .set(20, 8, FLOWER.pink)
      .set(19, 9, SAND[3])
      .set(21, 10, SAND[3])
    tile.rect(18, 13, 6, 1, SAND[0])
    for (let x = 4; x < 16; x++) tile.set(x, 22 + Math.round(Math.sin(x / 2) * 1.2), SAND[1])
    for (let x = 6; x < 14; x++) tile.set(x, 21 + Math.round(Math.sin(x / 2) * 1.2), SAND[4])
  }
  return tile
}

/** A peça de um descritor de `maps.ts` ("gggs", "gggg|muro|NS", "ssss|cordao|EW"…). */
export function tileFor(kind: string): Px {
  const [cornerText, overlay, links = ''] = kind.split('|') as [string, string?, string?]
  const corners = [...cornerText].map((letter) => (letter === 'g' ? 1 : 0)) as unknown as Corners
  const base = terrain(corners)
  if (!overlay) return base
  return rock(base, links, overlay === 'muro' ? WALL : RIDGE, cornerText === 'gggg')
}

export const GRASS_VARIANTS = [0, 1, 2].map(grassVariant)
export const SAND_VARIANTS = [0, 1].map(sandVariant)
/** Sorteio estável do enfeite de cada casa de chão liso (a maioria fica lisa). */
export function decoration(x: number, y: number, count: number, chance: number): number {
  return hash(x, y, 77) < chance ? Math.floor(hash(x, y, 78) * count) : -1
}

/**
 * O modo construção da Morada (proposta de 26/11/2026): as regras puras de ONDE uma peça cai,
 * usadas pelo quarto da plataforma e pelo Arquipélago. Nada aqui desenha nem guarda: recebe a casa
 * e devolve a instância (e, para janela e porta, a troca do trecho de parede).
 *
 * Convenções (as do `createMoradaHouse` e do three.js): posição em metros relativa à origem do
 * cômodo, giro em Y; o eixo x local de uma peça vai para (cos r, −sin r) no chão e o z local para
 * (sin r, cos r). As paredes têm o pivô na PONTA esquerda (x de 0 ao comprimento); janelas, portas
 * e móveis têm o pivô no centro da caixa.
 */
import { MORADA_CATALOG } from './catalog.generated'
import { MORADA_INSERT_OPENINGS } from './encaixes.generated'
import { moradaBoundaryMargin, moradaFootprint } from './house'
import type { MoradaCatalog, MoradaHouse, MoradaInstance, MoradaPiece, MoradaVector } from './types'

type XZ = [number, number]

/** O passo da grade do chão e o do trecho de parede. */
export const MORADA_GRID = 0.5
export const MORADA_WALL_STEP = 0.5
/** Mais longe que isso de uma parede, janela e quadro não grudam: pedem para chegar perto. */
export const MORADA_WALL_REACH = 1.6
/** As paredes lisas, da maior para a menor: completam o trecho que sobra ao abrir uma janela. */
const SOLID_WALLS = [
  'construcao/parede_4m',
  'construcao/parede_2m',
  'construcao/parede_1m',
  'construcao/parede_0_5m',
  'construcao/parede_0_25m',
] as const

const local = (lx: number, lz: number, r: number): XZ => [
  lx * Math.cos(r) + lz * Math.sin(r),
  -lx * Math.sin(r) + lz * Math.cos(r),
]
const snap = (v: number, step: number) => Math.round(v / step) * step
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Uma abertura de parede, no eixo do comprimento dela (x local, a partir da ponta). */
export interface MoradaOpening {
  from: number
  to: number
  bottom: number
  top: number
  kind: 'janela' | 'porta'
}

/** É parede de cômodo (alta), com ou sem abertura. Mureta e pilar ficam de fora. */
export function isMoradaWall(piece: MoradaPiece | undefined): piece is MoradaPiece {
  return Boolean(
    piece &&
      piece.category === 'paredes' &&
      piece.size[1] >= 2.5 &&
      piece.size[0] >= 0.25 &&
      piece.size[2] <= 0.3,
  )
}

/** Janela ou porta que entra numa abertura (as dos encaixes de Natal também). */
export function moradaInsertKind(piece: MoradaPiece | undefined): 'janela' | 'porta' | null {
  if (!piece || piece.kind !== 'construction') return null
  if (piece.category === 'janelas') return 'janela'
  if (piece.category === 'portas') return 'porta'
  if (piece.category === 'encaixes') return /porta/.test(piece.id) ? 'porta' : 'janela'
  return null
}

/**
 * As aberturas de uma parede, tiradas das caixas de colisão dela (é a única medida que o catálogo
 * tem): os vãos entre as colunas da altura toda; dentro do vão, o peitoril dá o chão da abertura e
 * a verga, o alto. Sem peitoril é porta.
 */
export function moradaWallOpenings(piece: MoradaPiece): MoradaOpening[] {
  if (!isMoradaWall(piece)) return []
  const height = piece.size[1]
  const boxes = piece.colliders.map((c) => ({
    x0: c.center[0] - c.size[0] / 2,
    x1: c.center[0] + c.size[0] / 2,
    y0: c.center[1] - c.size[1] / 2,
    y1: c.center[1] + c.size[1] / 2,
  }))
  const full = boxes.filter((b) => b.y1 - b.y0 >= height - 0.05).sort((a, b) => a.x0 - b.x0)
  const openings: MoradaOpening[] = []
  let cursor = 0
  for (const column of [...full, { x0: piece.size[0], x1: piece.size[0], y0: 0, y1: height }]) {
    if (column.x0 - cursor > 0.3) {
      const inside = boxes.filter(
        (b) => b.x0 >= cursor - 0.01 && b.x1 <= column.x0 + 0.01 && b.y1 - b.y0 < height - 0.05,
      )
      const sill = inside.filter((b) => b.y0 < 0.05)
      const lintel = inside.filter((b) => b.y1 > height - 0.05)
      const bottom = sill.length ? Math.max(...sill.map((b) => b.y1)) : 0
      const top = lintel.length ? Math.min(...lintel.map((b) => b.y0)) : height
      if (top - bottom > 0.3)
        openings.push({
          from: cursor,
          to: column.x0,
          bottom,
          top,
          kind: bottom < 0.05 ? 'porta' : 'janela',
        })
    }
    cursor = Math.max(cursor, column.x1)
  }
  return openings
}

/**
 * O vão que a ARTE desenhou para esta janela ou porta (`encaixes.generated.ts`, tirado do `vao` de
 * cada peça): a moldura passa do vão de propósito (o óculo de 0,9 m vai no vão de 0,6 m; a janela
 * quadrada de Natal, de 1,5 m, no de 1,2 m), então só o tamanho erra o par. `null` quando a arte não
 * disse ou quando a parede não está neste catálogo.
 */
export function moradaAuthoredOpening(
  insert: MoradaPiece,
  catalog: MoradaCatalog = MORADA_CATALOG,
): { wall: MoradaPiece; opening: MoradaOpening } | null {
  const authored = MORADA_INSERT_OPENINGS[insert.id]
  const wall = authored ? catalog.pieces[authored.wall] : undefined
  const opening = authored && wall ? moradaWallOpenings(wall)[authored.index] : undefined
  return wall && opening ? { wall, opening } : null
}

const sameOpening = (a: MoradaOpening, b: MoradaOpening) =>
  a.kind === b.kind &&
  Math.abs(a.to - a.from - (b.to - b.from)) < 0.02 &&
  Math.abs(a.bottom - b.bottom) < 0.02 &&
  Math.abs(a.top - b.top) < 0.02

/**
 * A janela (ou porta) entra nesta abertura. Com o vão da arte, vale qualquer abertura do MESMO
 * tamanho (a porta da parede de 2 m também entra na de 1 m). Sem ele (peça nova sem `vao`), a régua
 * do tamanho: a moldura passa um pouco, nunca fica menor que o vão.
 */
export function moradaOpeningFits(
  opening: MoradaOpening,
  insert: MoradaPiece,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  const kind = moradaInsertKind(insert)
  if (!kind || kind !== opening.kind) return false
  const authored = moradaAuthoredOpening(insert, catalog)
  if (authored) return sameOpening(opening, authored.opening)
  const width = opening.to - opening.from
  if (insert.size[0] < width - 0.06 || insert.size[0] > width + 0.2) return false
  return kind === 'porta' || Math.abs(insert.min[1] - opening.bottom) <= 0.3
}

/**
 * As paredes com abertura onde esta janela entra, da que encaixa melhor para a pior: a parede que
 * a arte desenhou para ela vem primeiro; depois as outras com o vão do mesmo tamanho.
 */
export function moradaOpeningWallsFor(
  insert: MoradaPiece,
  catalog: MoradaCatalog = MORADA_CATALOG,
): { wall: MoradaPiece; opening: MoradaOpening }[] {
  const authoredWall = moradaAuthoredOpening(insert, catalog)?.wall.id
  const found: { wall: MoradaPiece; opening: MoradaOpening; score: number }[] = []
  for (const wall of Object.values(catalog.pieces)) {
    if (!isMoradaWall(wall)) continue
    for (const opening of moradaWallOpenings(wall))
      if (moradaOpeningFits(opening, insert, catalog))
        found.push({
          wall,
          opening,
          score:
            (wall.id === authoredWall ? -10 : 0) +
            Math.abs(insert.size[0] - (opening.to - opening.from)) +
            Math.abs(insert.min[1] - opening.bottom) +
            wall.size[0] * 0.01,
        })
  }
  return found.sort((a, b) => a.score - b.score).map(({ wall, opening }) => ({ wall, opening }))
}

/** Um trecho de parede do cômodo, no chão. */
export interface MoradaWallSegment {
  instance: MoradaInstance
  piece: MoradaPiece
  start: XZ
  dir: XZ
  /** A normal da face de DENTRO (para o centro do cômodo). */
  inward: XZ
  length: number
  thickness: number
  openings: MoradaOpening[]
}

/**
 * Os trechos de parede de um cômodo (o quarto da plataforma é `house.roomId`; o Arquipélago edita
 * a casa inteira e passa o cômodo). Posições na coordenada do cômodo.
 */
export function moradaWalls(
  house: MoradaHouse,
  catalog: MoradaCatalog = MORADA_CATALOG,
  roomId: string = house.roomId,
): MoradaWallSegment[] {
  const walls: MoradaWallSegment[] = []
  for (const instance of house.instances) {
    if (instance.roomId !== roomId || instance.parentId) continue
    const piece = catalog.pieces[instance.pieceId]
    if (!isMoradaWall(piece)) continue
    const r = instance.rotation
    const dir: XZ = [Math.cos(r), -Math.sin(r)]
    const normal: XZ = [Math.sin(r), Math.cos(r)]
    const start: XZ = [instance.position[0], instance.position[2]]
    const mid: XZ = [
      start[0] + (dir[0] * piece.size[0]) / 2,
      start[1] + (dir[1] * piece.size[0]) / 2,
    ]
    const toCenter = -mid[0] * normal[0] - mid[1] * normal[1]
    walls.push({
      instance,
      piece,
      start,
      dir,
      inward: toCenter >= 0 ? normal : [-normal[0], -normal[1]],
      length: piece.size[0],
      thickness: piece.size[2],
      openings: moradaWallOpenings(piece),
    })
  }
  return walls
}

function nearestWall(walls: MoradaWallSegment[], point: XZ) {
  let best: { wall: MoradaWallSegment; along: number; distance: number } | null = null
  for (const wall of walls) {
    const dx = point[0] - wall.start[0]
    const dz = point[1] - wall.start[1]
    const along = clamp(dx * wall.dir[0] + dz * wall.dir[1], 0, wall.length)
    const px = wall.start[0] + wall.dir[0] * along
    const pz = wall.start[1] + wall.dir[1] * along
    const distance = Math.hypot(point[0] - px, point[1] - pz)
    if (!best || distance < best.distance) best = { wall, along, distance }
  }
  return best
}

const pieceCenter = (piece: MoradaPiece): XZ => [
  (piece.min[0] + piece.max[0]) / 2,
  (piece.min[2] + piece.max[2]) / 2,
]

/** O centro da caixa da instância, no chão do cômodo. */
export function moradaInstanceCenter(instance: MoradaInstance, piece: MoradaPiece): XZ {
  const [cx, cz] = pieceCenter(piece)
  const [ox, oz] = local(cx, cz, instance.rotation)
  return [instance.position[0] + ox, instance.position[2] + oz]
}

/** Gira em volta do centro da caixa (o pivô das paredes é a ponta: girar por ele as arrastava). */
export function moradaRotateAroundCenter(
  instance: MoradaInstance,
  piece: MoradaPiece,
  delta = Math.PI / 2,
): MoradaInstance {
  const center = moradaInstanceCenter(instance, piece)
  const rotation = (((instance.rotation + delta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const [cx, cz] = pieceCenter(piece)
  const [ox, oz] = local(cx, cz, rotation)
  return { ...instance, rotation, position: [center[0] - ox, instance.position[1], center[1] - oz] }
}

/** Cabe no cômodo (a construção pode passar a margem da parede). */
export function moradaInsideRoom(
  house: MoradaHouse,
  instance: MoradaInstance,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  const piece = catalog.pieces[instance.pieceId]
  const room = house.rooms.find((r) => r.id === instance.roomId)
  if (!piece || !room) return false
  if (instance.parentId) return true
  const margin = moradaBoundaryMargin(piece)
  return [piece.min[0], piece.max[0]].every((x) =>
    [piece.min[2], piece.max[2]].every((z) => {
      const [ox, oz] = local(x, z, instance.rotation)
      return (
        Math.abs(instance.position[0] + ox) <= room.size[0] / 2 + margin &&
        Math.abs(instance.position[2] + oz) <= room.size[1] / 2 + margin
      )
    }),
  )
}

const UNDER = new Set(['tapetes'])
function footprintBox(instance: MoradaInstance, piece: MoradaPiece) {
  const [cx, cz] = moradaInstanceCenter(instance, piece)
  const [w, , d] = moradaFootprint(piece.size, instance.rotation)
  return { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }
}

/** A outra peça de chão que esta ocuparia (tapete fica embaixo de tudo e não bate). */
export function moradaOverlap(
  house: MoradaHouse,
  instance: MoradaInstance,
  catalog: MoradaCatalog = MORADA_CATALOG,
  ignoreId?: string,
): MoradaInstance | null {
  const piece = catalog.pieces[instance.pieceId]
  if (
    !piece ||
    piece.kind === 'construction' ||
    piece.mount !== 'floor' ||
    UNDER.has(piece.category)
  )
    return null
  const box = footprintBox(instance, piece)
  for (const other of house.instances) {
    if (
      other.id === instance.id ||
      other.id === ignoreId ||
      other.parentId ||
      other.roomId !== instance.roomId
    )
      continue
    const model = catalog.pieces[other.pieceId]
    if (
      !model ||
      model.kind === 'construction' ||
      model.mount !== 'floor' ||
      UNDER.has(model.category)
    )
      continue
    const o = footprintBox(other, model)
    const w = Math.min(box.x1, o.x1) - Math.max(box.x0, o.x0)
    const d = Math.min(box.z1, o.z1) - Math.max(box.z0, o.z0)
    if (w > 0.05 && d > 0.05) return other
  }
  return null
}

/** O resultado de pôr (ou mover) uma peça: a instância e, se for preciso, a troca de paredes. */
export interface MoradaPlacement {
  instance: MoradaInstance
  /** Janela ou porta numa parede lisa: o trecho sai e entram a parede com abertura e o resto. */
  replace?: { remove: string[]; add: MoradaInstance[] }
  /** O trecho de parede onde a peça gruda (para o palco destacar). */
  wallId?: string
  valid: boolean
  /** A frase curta para a criança quando não dá. */
  reason?: string
}

let counter = 0
const newId = (seed: string) => `${seed}-${Date.now().toString(36)}-${(counter++).toString(36)}`

function fillWall(
  from: number,
  to: number,
  wall: MoradaWallSegment,
  catalog: MoradaCatalog,
): MoradaInstance[] {
  const out: MoradaInstance[] = []
  let at = from
  while (to - at > 0.01) {
    const id = SOLID_WALLS.find((wid) => {
      const p = catalog.pieces[wid]
      return p && p.size[0] <= to - at + 0.001
    })
    const piece = id ? catalog.pieces[id] : undefined
    if (!id || !piece) break
    out.push({
      id: newId('parede'),
      pieceId: id,
      roomId: wall.instance.roomId,
      rotation: wall.instance.rotation,
      position: [
        wall.start[0] + wall.dir[0] * at,
        wall.instance.position[1],
        wall.start[1] + wall.dir[1] * at,
      ],
      ...(wall.instance.materials ? { materials: wall.instance.materials } : {}),
      ...(wall.instance.colors ? { colors: wall.instance.colors } : {}),
    })
    at += piece.size[0]
  }
  return out
}

/** As janelas e portas que já estão neste trecho de parede. */
function insertsOn(
  house: MoradaHouse,
  wall: MoradaWallSegment,
  catalog: MoradaCatalog,
  ignoreId?: string,
) {
  return house.instances.filter((i) => {
    if (i.id === ignoreId || i.roomId !== wall.instance.roomId || i.parentId) return false
    const piece = catalog.pieces[i.pieceId]
    if (!moradaInsertKind(piece) || !piece) return false
    const [x, z] = moradaInstanceCenter(i, piece)
    const along = (x - wall.start[0]) * wall.dir[0] + (z - wall.start[1]) * wall.dir[1]
    const off = Math.abs((x - wall.start[0]) * wall.dir[1] - (z - wall.start[1]) * wall.dir[0])
    return off < 0.2 && along > -0.05 && along < wall.length + 0.05
  })
}

/**
 * Mover uma janela que já está na casa para OUTRO trecho fecha o vão de onde ela saiu (a mesma
 * régua de tirar): sem isto, o buraco ficava aberto na parede antiga e era salvo assim.
 */
function closeOldOpening(
  house: MoradaHouse,
  base: MoradaInstance,
  placement: MoradaPlacement,
  catalog: MoradaCatalog,
): MoradaPlacement {
  const old = house.instances.find((i) => i.id === base.id)
  if (!old) return placement
  const close = closeWindowOpening(house, old, catalog)
  if (
    !close ||
    close.wallId === placement.wallId ||
    placement.replace?.remove.includes(close.wallId)
  )
    return placement
  return {
    ...placement,
    replace: {
      remove: [...(placement.replace?.remove ?? []), close.wallId],
      add: [...(placement.replace?.add ?? []), ...close.closed],
    },
  }
}

/**
 * Onde a peça cai com o ponteiro em `point` (no chão do cômodo):
 * - **janela e porta** grudam na parede mais perto, viradas como ela, no vão que serve; numa parede
 *   lisa, o trecho vira a parede com a abertura certa e o resto continua liso;
 * - **o que vai na parede** (quadro, prateleira) gruda na face de dentro, de costas para ela;
 * - **o que vai no chão** anda pela grade de meio metro pelo CENTRO da caixa, e não ocupa o lugar de
 *   outra peça.
 */
export function moradaPlace(
  house: MoradaHouse,
  pieceId: string,
  point: XZ,
  opts: {
    rotation?: number
    base?: MoradaInstance
    catalog?: MoradaCatalog
    /** O cômodo onde a peça cai (padrão: o da base, senão o quarto `house.roomId`). */
    roomId?: string
  } = {},
): MoradaPlacement {
  const catalog = opts.catalog ?? MORADA_CATALOG
  const piece = catalog.pieces[pieceId]
  const rotation = opts.rotation ?? opts.base?.rotation ?? 0
  const roomId = opts.roomId ?? opts.base?.roomId ?? house.roomId
  const base: MoradaInstance = {
    ...(opts.base ?? { id: newId('peca'), pieceId, position: [0, 0, 0], rotation }),
    roomId,
  }
  if (!piece) return { instance: base, valid: false, reason: 'Peça desconhecida.' }
  const kind = moradaInsertKind(piece)
  const walls = moradaWalls(house, catalog, roomId).filter((w) => w.instance.id !== base.id)

  if (kind || piece.mount === 'wall') {
    const near = nearestWall(walls, point)
    if (!near || near.distance > MORADA_WALL_REACH) {
      const ghost = { ...base, rotation, position: [point[0], 0, point[1]] as MoradaVector }
      return {
        instance: ghost,
        valid: false,
        reason: kind
          ? `${kind === 'porta' ? 'Porta' : 'Janela'} vai na parede. Chegue mais perto de uma.`
          : 'Esta peça vai na parede. Chegue mais perto de uma.',
      }
    }
    const { wall } = near
    const wallRotation = wall.instance.rotation
    if (kind) {
      const placeAt = (along: number): MoradaInstance => {
        const [cx, cz] = pieceCenter(piece)
        const [ox, oz] = local(cx, cz, wallRotation)
        return {
          ...base,
          rotation: wallRotation,
          position: [
            wall.start[0] + wall.dir[0] * along - ox,
            0,
            wall.start[1] + wall.dir[1] * along - oz,
          ],
        }
      }
      // Um vão desta parede serve: a janela entra nele.
      const fits = wall.openings
        .filter((o) => moradaOpeningFits(o, piece, catalog))
        .sort(
          (a, b) =>
            Math.abs((a.from + a.to) / 2 - near.along) - Math.abs((b.from + b.to) / 2 - near.along),
        )[0]
      if (fits) {
        const instance = placeAt((fits.from + fits.to) / 2)
        const taken = insertsOn(house, wall, catalog, base.id).some((other) => {
          const model = catalog.pieces[other.pieceId]
          if (!model) return false
          const [x, z] = moradaInstanceCenter(other, model)
          const [ix, iz] = moradaInstanceCenter(instance, piece)
          return Math.hypot(x - ix, z - iz) < 0.3
        })
        return taken
          ? {
              instance,
              wallId: wall.instance.id,
              valid: false,
              reason: 'Este vão já tem uma janela ou porta.',
            }
          : closeOldOpening(
              house,
              base,
              { instance, wallId: wall.instance.id, valid: true },
              catalog,
            )
      }
      // Parede lisa (ou com outro vão): o trecho troca pela parede com a abertura desta peça.
      const options = moradaOpeningWallsFor(piece, catalog)
      const option = options.find((o) => o.wall.size[0] <= wall.length + 0.001)
      if (!option) {
        const instance = placeAt(
          clamp(near.along, piece.size[0] / 2, wall.length - piece.size[0] / 2),
        )
        // Com parede para ela no catálogo, o que falta é espaço: este trecho é mais curto.
        return {
          instance,
          wallId: wall.instance.id,
          valid: false,
          reason: options.length
            ? `Este trecho de parede é curto para esta ${kind}. Leve até uma parede maior.`
            : `Ainda não tem parede com o vão do tamanho desta ${kind}.`,
        }
      }
      // Só a parede LISA troca: a que já tem um vão (porta, passagem, arco, outra janela) fica.
      // Trocá-la apagava a passagem e podia fechar o quarto (revisão de 26/11/2026).
      if (wall.openings.length)
        return {
          instance: placeAt(clamp(near.along, 0, wall.length)),
          wallId: wall.instance.id,
          valid: false,
          reason: 'Este trecho de parede já tem uma abertura. Leve até uma parede lisa.',
        }
      const openingCenter = (option.opening.from + option.opening.to) / 2
      const start = clamp(
        snap(near.along - openingCenter, MORADA_WALL_STEP),
        0,
        wall.length - option.wall.size[0],
      )
      const opened: MoradaInstance = {
        id: newId('parede'),
        pieceId: option.wall.id,
        roomId: wall.instance.roomId,
        rotation: wallRotation,
        position: [
          wall.start[0] + wall.dir[0] * start,
          wall.instance.position[1],
          wall.start[1] + wall.dir[1] * start,
        ],
        ...(wall.instance.materials ? { materials: wall.instance.materials } : {}),
        ...(wall.instance.colors ? { colors: wall.instance.colors } : {}),
      }
      return closeOldOpening(
        house,
        base,
        {
          instance: placeAt(start + openingCenter),
          wallId: wall.instance.id,
          valid: true,
          replace: {
            remove: [wall.instance.id],
            add: [
              ...fillWall(0, start, wall, catalog),
              opened,
              ...fillWall(start + option.wall.size[0], wall.length, wall, catalog),
            ],
          },
        },
        catalog,
      )
    }
    // Peça de parede: de costas para a face de dentro, no passo de 25 cm.
    const facing = Math.atan2(wall.inward[0], wall.inward[1])
    const half = piece.size[0] / 2
    const along = clamp(
      snap(near.along, 0.25),
      Math.min(half, wall.length / 2),
      Math.max(wall.length - half, wall.length / 2),
    )
    const face: XZ = [
      wall.start[0] + wall.dir[0] * along + (wall.inward[0] * wall.thickness) / 2,
      wall.start[1] + wall.dir[1] * along + (wall.inward[1] * wall.thickness) / 2,
    ]
    const [ox, oz] = local(pieceCenter(piece)[0], piece.min[2], facing)
    const y =
      opts.base && opts.base.pieceId === pieceId
        ? opts.base.position[1]
        : Math.max(0, 1.4 - (piece.min[1] + piece.max[1]) / 2)
    const instance = {
      ...base,
      rotation: facing,
      position: [face[0] - ox, y, face[1] - oz] as MoradaVector,
    }
    return { instance, wallId: wall.instance.id, valid: true }
  }

  // No chão: o centro da caixa na grade.
  const [cx, cz] = pieceCenter(piece)
  const [ox, oz] = local(cx, cz, rotation)
  const center: XZ = [snap(point[0], MORADA_GRID), snap(point[1], MORADA_GRID)]
  const y =
    opts.base && opts.base.pieceId === pieceId
      ? opts.base.position[1]
      : piece.mount === 'ceiling'
        ? 3 - piece.max[1]
        : piece.category === 'chaos'
          ? -piece.max[1]
          : -piece.min[1]
  const instance: MoradaInstance = {
    ...base,
    rotation,
    position: [center[0] - ox, y, center[1] - oz],
  }
  if (!moradaInsideRoom(house, instance, catalog))
    return { instance, valid: false, reason: 'Fora do quarto. Traga para dentro.' }
  const other = moradaOverlap(house, instance, catalog, base.id)
  if (other)
    return {
      instance,
      valid: false,
      reason: `Ocupa o lugar de ${catalog.pieces[other.pieceId]?.label.toLocaleLowerCase('pt-BR') ?? 'outra peça'}.`,
    }
  return { instance, valid: true }
}

/**
 * O vão de JANELA onde esta janela estava, e o trecho liso que fecha esse vão (com as cores e os
 * materiais da parede), quando nenhuma outra janela ou porta usa o trecho. Vão de porta, passagem
 * e arco nunca fecham: tirar ou mover a porta deixa a passagem aberta, senão o quarto ficava sem
 * saída (revisão de 26/11/2026). `null` = nada a fechar.
 */
function closeWindowOpening(
  house: MoradaHouse,
  target: MoradaInstance,
  catalog: MoradaCatalog,
): { wallId: string; closed: MoradaInstance[] } | null {
  const piece = catalog.pieces[target.pieceId]
  // Peça do quintal (sem cômodo) não tem parede de cômodo para fechar.
  if (!target.roomId || !piece || target.parentId || moradaInsertKind(piece) !== 'janela')
    return null
  const [x, z] = moradaInstanceCenter(target, piece)
  for (const w of moradaWalls(house, catalog, target.roomId)) {
    const along = (x - w.start[0]) * w.dir[0] + (z - w.start[1]) * w.dir[1]
    const off = Math.abs((x - w.start[0]) * w.dir[1] - (z - w.start[1]) * w.dir[0])
    if (off >= 0.2) continue
    const opening = w.openings.find((o) => along >= o.from - 0.05 && along <= o.to + 0.05)
    if (!opening) continue
    if (opening.kind !== 'janela' || w.openings.some((o) => o.kind !== 'janela')) return null
    if (insertsOn(house, w, catalog, target.id).length) return null
    const closed = fillWall(0, w.length, w, catalog)
    return closed.length ? { wallId: w.instance.id, closed } : null
  }
  return null
}

/**
 * Tira uma peça (e o que está apoiado nela). Janela que sai deixa o vão dela fechado: o trecho de
 * parede com a abertura volta a ser parede lisa, com as mesmas cores, quando nenhuma outra janela
 * ou porta usa aquele trecho (o contrário da troca do `moradaPlace`). Porta que sai deixa a
 * passagem aberta.
 */
export function moradaRemove(
  house: MoradaHouse,
  id: string,
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaHouse {
  const removed = new Set([id])
  let count = 0
  while (count !== removed.size) {
    count = removed.size
    for (const instance of house.instances)
      if (instance.parentId && removed.has(instance.parentId)) removed.add(instance.id)
  }
  const next = { ...house, instances: house.instances.filter((i) => !removed.has(i.id)) }
  const target = house.instances.find((i) => i.id === id)
  const close = target ? closeWindowOpening(house, target, catalog) : null
  if (!close) return next
  return {
    ...next,
    instances: [...next.instances.filter((i) => i.id !== close.wallId), ...close.closed],
  }
}

/**
 * Tirar esta peça deixaria o cômodo sem nenhuma passagem (porta, passagem ou arco)? Devolve a
 * frase para a criança, ou `null` quando pode tirar. Só paredes com vão de porta contam: tirar a
 * porta (a folha) deixa a passagem aberta.
 */
export function moradaRemoveProblem(
  house: MoradaHouse,
  id: string,
  catalog: MoradaCatalog = MORADA_CATALOG,
): string | null {
  const target = house.instances.find((i) => i.id === id)
  const piece = target ? catalog.pieces[target.pieceId] : undefined
  if (!target?.roomId || !piece || target.parentId || !isMoradaWall(piece)) return null
  if (!moradaWallOpenings(piece).some((o) => o.kind === 'porta')) return null
  const doorways = moradaWalls(house, catalog, target.roomId).filter((w) =>
    w.openings.some((o) => o.kind === 'porta'),
  )
  return doorways.length <= 1 && doorways[0]?.instance.id === id
    ? 'Esta é a passagem do quarto. Deixe pelo menos uma porta.'
    : null
}

/** Grava a peça (nova ou movida) e a troca de paredes na casa. */
export function applyMoradaPlacement(house: MoradaHouse, placement: MoradaPlacement): MoradaHouse {
  const removed = new Set(placement.replace?.remove ?? [])
  const exists = house.instances.some((i) => i.id === placement.instance.id)
  const instances = house.instances
    .filter((i) => !removed.has(i.id))
    .map((i) => (i.id === placement.instance.id ? placement.instance : i))
  return {
    ...house,
    instances: [
      ...instances,
      ...(placement.replace?.add ?? []),
      ...(exists ? [] : [placement.instance]),
    ],
  }
}

/**
 * O desfazer do modo construção: a casa antes de cada gesto. Gestos com a mesma `key` em menos de
 * `MORADA_HISTORY_MERGE_MS` (os passos de um arraste, a cor escolhida no seletor) viram um passo só.
 */
export interface MoradaHistory {
  past: MoradaHouse[]
  future: MoradaHouse[]
  lastKey: string | null
  lastAt: number
}
export const MORADA_HISTORY_LIMIT = 60
export const MORADA_HISTORY_MERGE_MS = 700
export const emptyMoradaHistory = (): MoradaHistory => ({
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
})

export function pushMoradaHistory(
  history: MoradaHistory,
  before: MoradaHouse,
  key: string | null,
  now = Date.now(),
): MoradaHistory {
  if (key && key === history.lastKey && now - history.lastAt < MORADA_HISTORY_MERGE_MS)
    return { ...history, future: [], lastAt: now }
  return {
    past: [...history.past, before].slice(-MORADA_HISTORY_LIMIT),
    future: [],
    lastKey: key,
    lastAt: now,
  }
}
export function undoMoradaHistory(history: MoradaHistory, current: MoradaHouse) {
  const previous = history.past.at(-1)
  if (!previous) return null
  return {
    house: previous,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
      lastKey: null,
      lastAt: 0,
    },
  }
}
export function redoMoradaHistory(history: MoradaHistory, current: MoradaHouse) {
  const next = history.future[0]
  if (!next) return null
  return {
    house: next,
    history: {
      past: [...history.past, current],
      future: history.future.slice(1),
      lastKey: null,
      lastAt: 0,
    },
  }
}

/** Os tipos de construção do catálogo, na ordem do painel. */
export const MORADA_BUILD_TYPES = [
  { id: 'paredes', label: 'Paredes', categories: ['paredes'] },
  { id: 'janelas', label: 'Janelas', categories: ['janelas'] },
  { id: 'portas', label: 'Portas', categories: ['portas'] },
  { id: 'pisos', label: 'Pisos', categories: ['chaos'] },
  { id: 'acabamentos', label: 'Acabamentos', categories: ['lambris', 'batentes', 'cantos'] },
  { id: 'festas', label: 'Festas', categories: ['encaixes'] },
] as const
export type MoradaBuildType = (typeof MORADA_BUILD_TYPES)[number]['id']
export function moradaBuildType(piece: MoradaPiece): MoradaBuildType | null {
  if (piece.kind !== 'construction') return null
  return (
    MORADA_BUILD_TYPES.find((t) => (t.categories as readonly string[]).includes(piece.category))
      ?.id ?? null
  )
}

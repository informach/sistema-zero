/**
 * O retângulo de cada face na imagem: é o que impede o carimbo largo e o balde de vazarem para a
 * face do lado quando várias faces dividem uma folha (a superfície que a aba Pintar prepara).
 *
 * Vale por AMOSTRA: o traço atravessa de uma face para a outra, como no editor antigo, e cada
 * pedaço fica preso à face em que caiu. Mesmo arredondamento do `sceneImageTexel` (piso, linha
 * zero em V = 0), então o ponto tocado sempre cai dentro do retângulo da própria face.
 *
 * ⚠️ Na malha o limite é a ILHA de UV da face, não o triângulo: um modelo importado com a UV
 * contínua (a camisa inteira numa ilha só) pinta e enche de balde a ilha toda, sem cortar o
 * traço na borda de cada triângulo. Na folha que a oficina prepara, cada face é a sua ilha.
 */
import { FACE_IDS, type ShapeFaceId } from '../core/model'
import type { ScenePixelRegion } from './composite'
import type {
  SceneGeometry,
  SceneImage,
  SceneMeshGeometry,
  SceneUvTransform,
  Vec2,
} from './document'
import { indexMeshUv } from './meshUv'

const IDENTITY: SceneUvTransform = { origin: [0, 0], u: [1, 0], v: [0, 1] }
const UNIT_SQUARE: readonly Vec2[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
]

/** O retângulo da UV: o menor e o maior valor de cada eixo. */
interface UvBox {
  readonly low: Vec2
  readonly high: Vec2
}

function boxOf(uvs: Iterable<Vec2>): UvBox | null {
  let lowU = Infinity
  let lowV = Infinity
  let highU = -Infinity
  let highV = -Infinity
  let any = false
  for (const uv of uvs) {
    if (!Number.isFinite(uv[0]) || !Number.isFinite(uv[1])) return null
    any = true
    lowU = Math.min(lowU, uv[0])
    highU = Math.max(highU, uv[0])
    lowV = Math.min(lowV, uv[1])
    highV = Math.max(highV, uv[1])
  }
  return any ? { low: [lowU, lowV], high: [highU, highV] } : null
}

/**
 * Por identidade: a geometria é imutável em cada revisão, e pintar não a troca. O retângulo de
 * cada ilha é medido UMA vez: antes cada chamada percorria a ilha inteira, e o traço (uma chamada
 * por amostra) e o "Vestir" (uma por face) ficavam quadráticos numa malha com a UV contínua.
 */
const islandsByMesh = new WeakMap<
  SceneMeshGeometry,
  { index: ReturnType<typeof indexMeshUv>; boxes: Map<number, UvBox | null> }
>()

function meshIslands(geometry: SceneMeshGeometry) {
  let found = islandsByMesh.get(geometry)
  if (!found) {
    found = { index: indexMeshUv(geometry), boxes: new Map() }
    islandsByMesh.set(geometry, found)
  }
  return found
}

function* islandUvs(geometry: SceneMeshGeometry, faces: readonly string[]) {
  for (const id of faces) for (const corner of geometry.faces[id]!.corners) yield corner.uv
}

function faceUvBox(geometry: SceneGeometry, faceId: string): UvBox | null {
  if (geometry.kind === 'mesh') {
    if (!Object.hasOwn(geometry.faces, faceId)) return null
    const { index, boxes } = meshIslands(geometry)
    const island = index.byFace.get(faceId)
    const faces = island === undefined ? undefined : index.islands[island]
    if (island === undefined || !faces) return boxOf(islandUvs(geometry, [faceId]))
    if (!boxes.has(island)) boxes.set(island, boxOf(islandUvs(geometry, faces)))
    return boxes.get(island) ?? null
  }
  if (!(FACE_IDS as readonly string[]).includes(faceId)) return null
  const transform = geometry.surfaces[faceId as ShapeFaceId]?.uv ?? IDENTITY
  return boxOf(
    UNIT_SQUARE.map(
      ([a, b]): Vec2 => [
        transform.origin[0] + a * transform.u[0] + b * transform.v[0],
        transform.origin[1] + a * transform.u[1] + b * transform.v[1],
      ],
    ),
  )
}

/**
 * A ilha de UV da face, para agrupar as faces que dividem o mesmo retângulo (o "Vestir" calcula
 * a vista uma vez por ilha). Nas formas, a própria superfície.
 */
export function scenePaintIslandKey(geometry: SceneGeometry, faceId: string): string {
  if (geometry.kind !== 'mesh') return faceId
  const island = meshIslands(geometry).index.byFace.get(faceId)
  return island === undefined ? `face:${faceId}` : `ilha:${island}`
}

function span(low: number, high: number, size: number): [number, number] {
  const from = Math.min(size - 1, Math.max(0, Math.floor(low * size)))
  const to = Math.min(size - 1, Math.max(from, Math.ceil(high * size) - 1))
  return [from, to]
}

/**
 * `faceId` é a superfície da forma ou do tubo (`px`, `side`) ou a chave da face da malha, como o
 * palco informa. `null` quando a face não existe ou tem UV inválida.
 *
 * `within`: o quadro da pintura que se mexe. Ali a UV corre pela CÉLULA, não pela folha, então o
 * retângulo da face é medido no tamanho do quadro e somado à origem dele (sem isso o balde e o
 * "Girar" pegavam o quadro inteiro, todas as faces juntas).
 */
export function scenePaintFaceBounds(
  geometry: SceneGeometry,
  faceId: string,
  image: Pick<SceneImage, 'width' | 'height'>,
  within?: ScenePixelRegion,
): ScenePixelRegion | null {
  const box = faceUvBox(geometry, faceId)
  if (!box) return null
  const width = within ? within.x1 - within.x0 + 1 : image.width
  const height = within ? within.y1 - within.y0 + 1 : image.height
  const [x0, x1] = span(box.low[0], box.high[0], width)
  const [y0, y1] = span(box.low[1], box.high[1], height)
  const dx = within?.x0 ?? 0
  const dy = within?.y0 ?? 0
  return { x0: x0 + dx, y0: y0 + dy, x1: x1 + dx, y1: y1 + dy }
}

/** Área da UV de uma face (a fórmula do laço, em valor absoluto). */
function uvArea(uvs: readonly Vec2[]): number {
  let sum = 0
  for (let i = 0; i < uvs.length; i++) {
    const a = uvs[i]!
    const b = uvs[(i + 1) % uvs.length]!
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(sum) / 2
}

/**
 * Girar a pintura da face gira o RETÂNGULO dela na folha. Isso só é a face girando quando ela
 * ENCHE o retângulo: as superfícies das formas e a face de quatro cantos alinhada da malha. Num
 * triângulo, ou numa ilha em L de um modelo importado (o retângulo pega pedaços de outras ilhas),
 * girar embaralharia a pintura, então a oficina recusa.
 */
export function scenePaintFaceFillsBounds(geometry: SceneGeometry, faceId: string): boolean {
  if (geometry.kind !== 'mesh') return faceUvBox(geometry, faceId) !== null
  const box = faceUvBox(geometry, faceId)
  if (!box) return false
  const { index } = meshIslands(geometry)
  const island = index.byFace.get(faceId)
  const faces = (island === undefined ? undefined : index.islands[island]) ?? [faceId]
  let area = 0
  for (const id of faces) area += uvArea(geometry.faces[id]!.corners.map((corner) => corner.uv))
  const rect = (box.high[0] - box.low[0]) * (box.high[1] - box.low[1])
  return rect > 0 && area / rect > 0.9
}

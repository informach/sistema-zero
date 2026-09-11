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

/** Por identidade: a geometria é imutável em cada revisão, e pintar não a troca. */
const islandsByMesh = new WeakMap<SceneMeshGeometry, ReturnType<typeof indexMeshUv>>()

function faceUvs(geometry: SceneGeometry, faceId: string): Vec2[] | null {
  if (geometry.kind === 'mesh') {
    if (!Object.hasOwn(geometry.faces, faceId)) return null
    let islands = islandsByMesh.get(geometry)
    if (!islands) {
      islands = indexMeshUv(geometry)
      islandsByMesh.set(geometry, islands)
    }
    const island = islands.islands[islands.byFace.get(faceId) ?? -1] ?? [faceId]
    return island.flatMap((id) => geometry.faces[id]!.corners.map((corner) => corner.uv))
  }
  if (!(FACE_IDS as readonly string[]).includes(faceId)) return null
  const transform = geometry.surfaces[faceId as ShapeFaceId]?.uv ?? IDENTITY
  return UNIT_SQUARE.map(([a, b]) => [
    transform.origin[0] + a * transform.u[0] + b * transform.v[0],
    transform.origin[1] + a * transform.u[1] + b * transform.v[1],
  ])
}

function span(uvs: readonly Vec2[], axis: 0 | 1, size: number): [number, number] {
  let low = Infinity
  let high = -Infinity
  for (const uv of uvs) {
    low = Math.min(low, uv[axis])
    high = Math.max(high, uv[axis])
  }
  const from = Math.min(size - 1, Math.max(0, Math.floor(low * size)))
  const to = Math.min(size - 1, Math.max(from, Math.ceil(high * size) - 1))
  return [from, to]
}

/**
 * `faceId` é a superfície da forma ou do tubo (`px`, `side`) ou a chave da face da malha, como o
 * palco informa. `null` quando a face não existe ou tem UV inválida.
 */
export function scenePaintFaceBounds(
  geometry: SceneGeometry,
  faceId: string,
  image: Pick<SceneImage, 'width' | 'height'>,
): ScenePixelRegion | null {
  const uvs = faceUvs(geometry, faceId)
  if (!uvs?.length || !uvs.every((uv) => Number.isFinite(uv[0]) && Number.isFinite(uv[1])))
    return null
  const [x0, x1] = span(uvs, 0, image.width)
  const [y0, y1] = span(uvs, 1, image.height)
  return { x0, y0, x1, y1 }
}

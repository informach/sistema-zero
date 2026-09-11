/**
 * O retângulo de cada face na imagem: é o que impede o carimbo largo e o balde de vazarem para a
 * face do lado quando várias faces dividem uma folha (a superfície que a aba Pintar prepara).
 *
 * Vale por AMOSTRA: o traço atravessa de uma face para a outra, como no editor antigo, e cada
 * pedaço fica preso à face em que caiu. Mesmo arredondamento do `sceneImageTexel` (piso, linha
 * zero em V = 0), então o ponto tocado sempre cai dentro do retângulo da própria face.
 */
import { FACE_IDS, type ShapeFaceId } from '../core/model'
import type { ScenePixelRegion } from './composite'
import type { SceneGeometry, SceneImage, SceneUvTransform, Vec2 } from './document'

const IDENTITY: SceneUvTransform = { origin: [0, 0], u: [1, 0], v: [0, 1] }
const UNIT_SQUARE: readonly Vec2[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
]

function faceUvs(geometry: SceneGeometry, faceId: string): readonly Vec2[] | null {
  if (geometry.kind === 'mesh')
    return Object.hasOwn(geometry.faces, faceId)
      ? geometry.faces[faceId]!.corners.map((corner) => corner.uv)
      : null
  if (!(FACE_IDS as readonly string[]).includes(faceId)) return null
  const transform = geometry.surfaces[faceId as ShapeFaceId]?.uv ?? IDENTITY
  return UNIT_SQUARE.map(([a, b]) => [
    transform.origin[0] + a * transform.u[0] + b * transform.v[0],
    transform.origin[1] + a * transform.u[1] + b * transform.v[1],
  ])
}

function span(values: readonly number[], size: number): [number, number] {
  const from = Math.min(size - 1, Math.max(0, Math.floor(Math.min(...values) * size)))
  const to = Math.min(size - 1, Math.max(from, Math.ceil(Math.max(...values) * size) - 1))
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
  const [x0, x1] = span(
    uvs.map((uv) => uv[0]),
    image.width,
  )
  const [y0, y1] = span(
    uvs.map((uv) => uv[1]),
    image.height,
  )
  return { x0, y0, x1, y1 }
}

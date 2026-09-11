/**
 * A face vista de fora, EM PÉ: qual texel da folha cai em cada célula de quem olha a face.
 *
 * A folha guarda as linhas de baixo para cima (linha zero em V = 0), mas cada face corre a UV do
 * seu jeito: nas formas, a do editor antigo (origem no canto de cima e `t` para baixo, então a
 * linha zero fica EM CIMA da face); na malha importada, a do arquivo; na malha que a oficina
 * prepara, a da projeção. "Pintar de perto" e "Vestir com textura" precisam da face como a criança
 * a vê, então a orientação sai da GEOMETRIA, com a régua das faces do editor antigo
 * (`model/frame.ts`): o "para cima" é o +Y da peça projetado na face; numa face deitada, o fundo
 * da peça (-Z) fica em cima olhando de cima, e a frente (+Z) olhando de baixo.
 *
 * Nas coordenadas da PEÇA, antes do giro dela, como no editor antigo.
 */
import type { Vec3 } from '../core/model'
import { cross, dot, normalize, scale, sub } from '../model/vec'
import type { Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from './composite'
import type { SceneGeometry, SceneImage, SceneMeshGeometry, Vec2 } from './document'
import { scenePaintFaceBounds } from './paintSurfaceBounds'
import { cachedParametricMesh } from './parametricGeometry'

export interface ScenePaintFaceView {
  readonly region: ScenePixelRegion
  /** As colunas da vista correm pelas LINHAS da folha (a UV da face está deitada). */
  readonly transpose: boolean
  /** O eixo x da folha anda de trás para a frente na vista (do fim da região ao começo). */
  readonly flipX: boolean
  /** O mesmo, no eixo y da folha. */
  readonly flipY: boolean
}

/** O jeito da folha inteira, quando a face não diz o dela: a linha zero embaixo. */
export function sceneSheetView(region: ScenePixelRegion): ScenePaintFaceView {
  return { region, transpose: false, flipX: false, flipY: true }
}

export function sceneFaceViewSize(view: ScenePaintFaceView) {
  const width = view.region.x1 - view.region.x0 + 1
  const height = view.region.y1 - view.region.y0 + 1
  return view.transpose ? { width: height, height: width } : { width, height }
}

/** O texel da célula (coluna, linha) da vista, com a linha zero EM CIMA. */
export function sceneFaceViewTexel(view: ScenePaintFaceView, column: number, row: number): Texel {
  const [a, b] = view.transpose ? [row, column] : [column, row]
  const { x0, y0, x1, y1 } = view.region
  return [view.flipX ? x1 - a : x0 + a, view.flipY ? y1 - b : y0 + b]
}

function meshOf(geometry: SceneGeometry) {
  if (geometry.kind === 'mesh') return { mesh: geometry, surfaceByFace: null }
  return cachedParametricMesh(geometry)
}

interface Corner {
  point: Vec3
  uv: Vec2
}

function corners(mesh: SceneMeshGeometry, faceId: string): Corner[] | null {
  if (!Object.hasOwn(mesh.faces, faceId)) return null
  const list: Corner[] = []
  for (const corner of mesh.faces[faceId]!.corners) {
    const point = Object.hasOwn(mesh.vertices, corner.vertexId)
      ? mesh.vertices[corner.vertexId]
      : undefined
    if (!point) return null
    list.push({ point, uv: corner.uv })
  }
  return list.length >= 3 ? list : null
}

/** Newell: a normal de fora de qualquer polígono, mesmo côncavo. */
function faceNormal(list: readonly Corner[]): Vec3 {
  const sum: Vec3 = [0, 0, 0]
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!.point
    const b = list[(i + 1) % list.length]!.point
    sum[0] += (a[1] - b[1]) * (a[2] + b[2])
    sum[1] += (a[2] - b[2]) * (a[0] + b[0])
    sum[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  return normalize(sum)
}

/**
 * Onde a face anda no espaço quando a UV anda: `u` e `v` em unidades da peça, pelo triângulo do
 * leque com a maior área de UV (o mais bem condicionado).
 */
function uvAxes(list: readonly Corner[]): { u: Vec3; v: Vec3 } | null {
  const origin = list[0]!
  let best: { u: Vec3; v: Vec3; area: number } | null = null
  for (let i = 1; i + 1 < list.length; i++) {
    const e1 = sub(list[i]!.point, origin.point)
    const e2 = sub(list[i + 1]!.point, origin.point)
    const du1 = list[i]!.uv[0] - origin.uv[0]
    const dv1 = list[i]!.uv[1] - origin.uv[1]
    const du2 = list[i + 1]!.uv[0] - origin.uv[0]
    const dv2 = list[i + 1]!.uv[1] - origin.uv[1]
    const det = du1 * dv2 - du2 * dv1
    if (!Number.isFinite(det) || Math.abs(det) <= (best?.area ?? 0)) continue
    best = {
      u: scale(sub(scale(e1, dv2), scale(e2, dv1)), 1 / det),
      v: scale(sub(scale(e2, du1), scale(e1, du2)), 1 / det),
      area: Math.abs(det),
    }
  }
  return best
}

function orientation(list: readonly Corner[], image: Pick<SceneImage, 'width' | 'height'>) {
  const axes = uvAxes(list)
  if (!axes) return null
  const normal = faceNormal(list)
  let up = sub([0, 1, 0], scale(normal, normal[1]))
  if (Math.hypot(...up) < 1e-6) up = normal[1] > 0 ? [0, 0, -1] : [0, 0, 1]
  up = normalize(up)
  const right = cross(up, normal)
  // A direção da tela em UV: mínimos quadrados sobre os dois eixos da face.
  const a = dot(axes.u, axes.u)
  const b = dot(axes.u, axes.v)
  const c = dot(axes.v, axes.v)
  const det = a * c - b * b
  if (!(det > 1e-12 * a * c) || !Number.isFinite(det)) return null
  const inTexels = (direction: Vec3): [number, number] => {
    const pu = dot(axes.u, direction)
    const pv = dot(axes.v, direction)
    return [((c * pu - b * pv) / det) * image.width, ((a * pv - b * pu) / det) * image.height]
  }
  const [rx, ry] = inTexels(right)
  const [dx, dy] = inTexels(scale(up, -1))
  return Math.abs(rx) >= Math.abs(ry)
    ? { transpose: false, flipX: rx < 0, flipY: dy < 0 }
    : { transpose: true, flipX: dx < 0, flipY: ry < 0 }
}

/**
 * A face `faceId` (a superfície da forma, `px` ou `side`, ou a chave da face da malha, como o
 * palco informa) em pé, na região dela na folha ou na `region` pedida (o quadro de uma pintura
 * que se mexe). `null` quando a face não existe; a folha crua quando a UV dela não tem área.
 */
export function scenePaintFaceView(
  geometry: SceneGeometry,
  faceId: string,
  image: Pick<SceneImage, 'width' | 'height'>,
  region: ScenePixelRegion | null = scenePaintFaceBounds(geometry, faceId, image),
): ScenePaintFaceView | null {
  if (!region) return null
  const { mesh, surfaceByFace } = meshOf(geometry)
  // Numa superfície curva (a volta do cilindro, a bola), a face mais "de lado" diz o em pé.
  let chosen: Corner[] | null = null
  let tilt = Infinity
  const candidates = surfaceByFace
    ? [...surfaceByFace].filter(([, surface]) => surface === faceId).map(([key]) => key)
    : [faceId]
  for (const key of candidates) {
    const list = corners(mesh, key)
    if (!list) continue
    const lean = Math.abs(faceNormal(list)[1])
    if (lean < tilt) {
      chosen = list
      tilt = lean
    }
  }
  if (!chosen) return candidates.length ? sceneSheetView(region) : null
  const found = orientation(chosen, image)
  return found ? { region, ...found } : sceneSheetView(region)
}

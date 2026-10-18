import type { Vec3 } from '../core/model'
import type { SceneImage, SceneMeshGeometry, Vec2 } from './document'
import { sceneImageTexel } from './imageCoordinates'
import { faceTurn } from './meshFaceFrame'
import { trianglesOverlap } from './meshUvOverlap'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

/** Transfer each authorial layer by triangle correspondence, with nearest-neighbor pixels. */
export function reprojectScenePaint(
  image: SceneImage,
  before: SceneMeshGeometry,
  after: SceneMeshGeometry,
  faces: readonly string[],
  width: number,
  height: number,
): SceneImage {
  requireScene(
    !image.flipbook,
    'image',
    'Essa pintura tem animação. Mantenha o mapa dela para preservar os quadros.',
  )
  const sources = new Int32Array(width * height).fill(-1)
  const coverage = new Uint8Array(width * height)
  for (const id of faces) {
    const old = before.faces[id]!,
      face = after.faces[id]!
    const result = triangulateFace(old.corners.map((corner) => before.vertices[corner.vertexId]!))
    requireScene(result.status === 'ok', 'faces', 'Esta face precisa ser ajustada antes de mapear.')
    for (const indices of result.triangles) {
      const points = indices.map(
        (i): Vec2 => [face.corners[i]!.uv[0] * width, face.corners[i]!.uv[1] * height],
      )
      const a = points[0]!,
        b = points[1]!,
        c = points[2]!
      const area = faceTurn(a, b, c)
      requireScene(
        Number.isFinite(area) && area !== 0,
        'uv',
        'Essa face não tem pixels suficientes para mapear.',
      )
      const x0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p[0]))))
      const x1 = Math.min(width - 1, Math.ceil(Math.max(...points.map((p) => p[0]))) - 1)
      const y0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))))
      const y1 = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p[1]))) - 1)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const point: Vec2 = [x + 0.5, y + 0.5]
          const v = faceTurn(a, point, c) / area,
            w = faceTurn(a, b, point) / area
          const weights: Vec3 = [1 - v - w, v, w]
          const inside = weights.every((value) => value >= -1e-10)
          const offset = y * width + x
          if (!inside) {
            // Preserve visible slivers that touch a pixel without covering its center.
            if (coverage[offset]! > 0) continue
            const square: Vec2[] = [
              [x, y],
              [x + 1, y],
              [x + 1, y + 1],
              [x, y + 1],
            ]
            if (
              !trianglesOverlap(points, [square[0]!, square[1]!, square[2]!]) &&
              !trianglesOverlap(points, [square[0]!, square[2]!, square[3]!])
            )
              continue
            const sum = weights.reduce((total, value) => total + Math.max(0, value), 0)
            for (const i of [0, 1, 2] as const) weights[i] = Math.max(0, weights[i]) / sum
          }
          const uv: Vec2 = [0, 0]
          for (let i = 0; i < 3; i++)
            for (const axis of [0, 1] as const)
              uv[axis] += old.corners[indices[i]!]!.uv[axis] * weights[i]!
          const source = sceneImageTexel(image, uv)
          requireScene(source, 'uv', 'A pintura anterior tem coordenadas inválidas.')
          sources[offset] = source[1] * image.width + source[0]
          coverage[offset] = inside ? 2 : 1
        }
    }
  }
  const channels = image.encoding === 'indexed' ? 1 : 4
  return {
    ...image,
    width,
    height,
    layers: image.layers.map((layer) => {
      const pixels = new Uint8Array(width * height * channels)
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i]!
        if (source < 0) continue
        for (let channel = 0; channel < channels; channel++)
          pixels[i * channels + channel] = layer.pixels[source * channels + channel]!
      }
      return { ...layer, pixels }
    }),
  }
}

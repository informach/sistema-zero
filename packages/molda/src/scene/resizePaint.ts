import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { dot, scale, sub } from '../model/vec'
import { copySceneMaterialForNode } from './appearanceCommands'
import { sceneAppearanceUsage } from './appearanceUsage'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import type {
  MoldaSceneDocument,
  SceneGeometry,
  SceneImage,
  SceneMeshGeometry,
  Vec2,
} from './document'
import { indexSceneDocument } from './documentIndex'
import { packSceneShelves } from './imageAtlas'
import { SCENE_LIMITS } from './limits'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { type AffineMatrix, transformDirection } from './matrix'
import { pixelExtent } from './meshPixelUv'
import { meshSymmetrySource } from './meshSymmetry'
import { indexMeshUv, mapMeshUv, meshUvBounds } from './meshUv'
import { trianglesOverlap } from './meshUvOverlap'
import { parametricMesh, sceneGeometryMesh } from './parametricGeometry'
import { reprojectScenePaint } from './reprojectPaint'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

/** Translation/rotation/reflection do not change lengths, even under a scaled parent. */
function sameMetric(a: Readonly<AffineMatrix>, b: Readonly<AffineMatrix>) {
  const axes: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  const left = axes.map((v) => transformDirection(a, v))
  const right = axes.map((v) => transformDirection(b, v))
  return axes.every((_, i) =>
    axes.every((_, j) => {
      const x = dot(left[i]!, left[j]!),
        y = dot(right[i]!, right[j]!)
      const magnitude =
        i === j
          ? Math.max(Math.abs(x), Math.abs(y))
          : Math.max(
              Math.hypot(...left[i]!) * Math.hypot(...left[j]!),
              Math.hypot(...right[i]!) * Math.hypot(...right[j]!),
            )
      return Math.abs(x - y) <= 1e-10 * magnitude
    }),
  )
}

/** Positive polar stretch in the existing UV directions, preserving a hand-rotated island. */
function chartMetric(
  mesh: SceneMeshGeometry,
  faces: string[],
  image: SceneImage,
  world: Readonly<AffineMatrix>,
) {
  let xx = 0,
    xy = 0,
    yy = 0,
    weight = 0
  for (const id of faces) {
    const face = mesh.faces[id]!
    const points = face.corners.map((c) => mesh.vertices[c.vertexId]!)
    const triangles = triangulateFace(points)
    requireScene(triangles.status === 'ok', 'faces', 'Ajuste esta face antes de mudar seu tamanho.')
    for (const [a, b, c] of triangles.triangles) {
      const uv = [a, b, c].map(
        (i): Vec2 => [face.corners[i]!.uv[0] * image.width, face.corners[i]!.uv[1] * image.height],
      )
      const du1 = uv[1]![0] - uv[0]![0],
        dv1 = uv[1]![1] - uv[0]![1]
      const du2 = uv[2]![0] - uv[0]![0],
        dv2 = uv[2]![1] - uv[0]![1]
      const det = du1 * dv2 - du2 * dv1
      requireScene(
        Number.isFinite(det) && det !== 0,
        'uv',
        'Organize os quadradinhos desta peça antes de mudar seu tamanho.',
      )
      const e1 = sub(points[b]!, points[a]!),
        e2 = sub(points[c]!, points[a]!)
      const u = transformDirection(world, scale(sub(scale(e1, dv2), scale(e2, dv1)), 1 / det))
      const v = transformDirection(world, scale(sub(scale(e2, du1), scale(e1, du2)), 1 / det))
      const w = Math.abs(det)
      xx += dot(u, u) * w
      xy += dot(u, v) * w
      yy += dot(v, v) * w
      weight += w
    }
  }
  requireScene(weight > 0, 'uv', 'Essa face não tem área para pintar.')
  xx /= weight
  xy /= weight
  yy /= weight
  const determinant = Math.sqrt(Math.max(0, xx * yy - xy * xy))
  const denominator = Math.sqrt(xx + yy + 2 * determinant)
  requireScene(
    Number.isFinite(denominator) && determinant > 0,
    'uv',
    'Esse tamanho deixa a pintura sem área.',
  )
  return [
    (xx + determinant) / denominator,
    xy / denominator,
    (yy + determinant) / denominator,
  ] as const
}

/** Raster coverage includes slivers; never copies a neighboring island through empty atlas space. */
function coverage(mesh: SceneMeshGeometry, faces: string[], width: number, height: number) {
  const bounds = meshUvBounds(mesh, faces)
  const left = Math.max(0, Math.floor(bounds.min[0] * width)),
    top = Math.max(0, Math.floor(bounds.min[1] * height))
  const right = Math.min(width, Math.ceil(bounds.max[0] * width)),
    bottom = Math.min(height, Math.ceil(bounds.max[1] * height))
  const stride = Math.max(0, right - left)
  const mask = new Uint8Array(stride * Math.max(0, bottom - top))
  for (const id of faces) {
    const face = mesh.faces[id]!
    const result = triangulateFace(face.corners.map((c) => mesh.vertices[c.vertexId]!))
    requireScene(result.status === 'ok', 'faces', 'Ajuste esta face antes de mudar seu tamanho.')
    for (const triangle of result.triangles) {
      const uv = triangle.map(
        (i): Vec2 => [face.corners[i]!.uv[0] * width, face.corners[i]!.uv[1] * height],
      )
      const x0 = Math.max(0, Math.floor(Math.min(...uv.map((p) => p[0]))))
      const x1 = Math.min(width, Math.ceil(Math.max(...uv.map((p) => p[0]))))
      const y0 = Math.max(0, Math.floor(Math.min(...uv.map((p) => p[1]))))
      const y1 = Math.min(height, Math.ceil(Math.max(...uv.map((p) => p[1]))))
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const offset = (y - top) * stride + x - left
          if (mask[offset]) continue
          const a: Vec2 = [x, y],
            b: Vec2 = [x + 1, y],
            c: Vec2 = [x + 1, y + 1],
            d: Vec2 = [x, y + 1]
          if (trianglesOverlap(uv, [a, b, c]) || trianglesOverlap(uv, [a, c, d])) mask[offset] = 1
        }
    }
  }
  return (x: number, y: number) =>
    x >= left && x < right && y >= top && y < bottom && !!mask[(y - top) * stride + x - left]
}

function resizeMap(
  mesh: SceneMeshGeometry,
  faces: string[],
  image: SceneImage,
  world: Readonly<AffineMatrix>,
  islands: string[][],
) {
  const charts = islands.map((ids) => {
    const bounds = meshUvBounds(mesh, ids)
    const origin: Vec2 = [bounds.min[0] * image.width, bounds.min[1] * image.height]
    const [a, b, c] = chartMetric(mesh, ids, image, world)
    const points = new Map<string, Vec2[]>()
    for (const id of ids)
      points.set(
        id,
        mesh.faces[id]!.corners.map(({ uv }): Vec2 => {
          const x = uv[0] * image.width - origin[0],
            y = uv[1] * image.height - origin[1]
          return [a * x + b * y, b * x + c * y]
        }),
      )
    const min: Vec2 = [Infinity, Infinity],
      max: Vec2 = [-Infinity, -Infinity]
    for (const corners of points.values())
      for (const point of corners)
        for (const axis of [0, 1] as const) {
          min[axis] = Math.min(min[axis], point[axis])
          max[axis] = Math.max(max[axis], point[axis])
        }
    return {
      ids,
      origin,
      points,
      min,
      width: pixelExtent(max[0] - min[0]),
      height: pixelExtent(max[1] - min[1]),
    }
  })
  const layout = packSceneShelves(charts)
  requireScene(
    layout,
    'images',
    'A pintura não cabe neste tamanho. Diminua a peça ou divida em partes.',
  )
  const byFace = new Map(charts.flatMap((chart, i) => chart.ids.map((id) => [id, i] as const)))
  const mapped = mapMeshUv(mesh, faces, (_uv, id, corner) => {
    const i = byFace.get(id)!,
      chart = charts[i]!,
      slot = layout.slots[i]!
    const point = chart.points.get(id)![corner]!
    return [
      (slot.x + point[0] - chart.min[0]) / layout.width,
      (slot.y + point[1] - chart.min[1]) / layout.height,
    ]
  })
  const channels = image.encoding === 'rgba' ? 4 : 1
  requireScene(
    layout.width * layout.height * channels * image.layers.length <= SCENE_LIMITS.pixelBytes,
    'images',
    'Essa mudança ultrapassa o espaço para pintura.',
  )
  const layers = image.layers.map((layer) => ({
    ...layer,
    pixels: new Uint8Array(layout.width * layout.height * channels),
  }))
  charts.forEach((chart, i) => {
    const oldMask = coverage(mesh, chart.ids, image.width, image.height)
    const newMask = coverage(mapped, chart.ids, layout.width, layout.height)
    const slot = layout.slots[i]!
    for (let y = 0; y < slot.height; y++)
      for (let x = 0; x < slot.width; x++) {
        const sx = Math.floor(chart.origin[0] + x),
          sy = Math.floor(chart.origin[1] + y)
        const to = (slot.y + y) * layout.width + slot.x + x,
          from = sy * image.width + sx
        if (
          sx < 0 ||
          sy < 0 ||
          sx >= image.width ||
          sy >= image.height ||
          !oldMask(sx, sy) ||
          !newMask(slot.x + x, slot.y + y)
        )
          continue
        layers.forEach((layer, l) => {
          for (let channel = 0; channel < channels; channel++)
            layer.pixels[to * channels + channel] =
              image.layers[l]!.pixels[from * channels + channel]!
        })
      }
  })
  return { mesh: mapped, image: { ...image, width: layout.width, height: layout.height, layers } }
}

/** Keep primitives parametric: changing paint must not remove cylinder/shape detail controls. */
function withUv(geometry: SceneGeometry, mesh: SceneMeshGeometry): SceneGeometry {
  if (geometry.kind === 'mesh') return { ...geometry, faces: mesh.faces }
  const raw = parametricMesh({ ...geometry, surfaces: {} })
  const surfaces = { ...geometry.surfaces }
  const done = new Set<string>()
  for (const [id, face] of Object.entries(raw.mesh.faces)) {
    const key = raw.surfaceByFace.get(id)!
    if (done.has(key)) continue
    const triangles = triangulateFace(face.corners.map((c) => raw.mesh.vertices[c.vertexId]!))
    if (triangles.status !== 'ok') continue
    const triangle = triangles.triangles.find(([a, b, c]) => {
      const p = face.corners[a]!.uv,
        q = face.corners[b]!.uv,
        r = face.corners[c]!.uv
      return Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) > 1e-14
    })
    if (!triangle) continue
    const [a, b, c] = triangle
    const p = face.corners[a]!.uv,
      q = face.corners[b]!.uv,
      r = face.corners[c]!.uv
    const mapped = mesh.faces[id]!.corners
    const t = mapped[a]!.uv,
      s = mapped[b]!.uv,
      v = mapped[c]!.uv
    const det = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])
    const u: Vec2 = [0, 0],
      w: Vec2 = [0, 0],
      origin: Vec2 = [0, 0]
    for (const axis of [0, 1] as const) {
      u[axis] = ((s[axis] - t[axis]) * (r[1] - p[1]) - (v[axis] - t[axis]) * (q[1] - p[1])) / det
      w[axis] = ((v[axis] - t[axis]) * (q[0] - p[0]) - (s[axis] - t[axis]) * (r[0] - p[0])) / det
      origin[axis] = t[axis] - p[0] * u[axis] - p[1] * w[axis]
    }
    surfaces[key] = { ...geometry.surfaces[key], uv: { origin, u, v: w } }
    done.add(key)
  }
  return { ...geometry, surfaces }
}

/** A single authorial revision; old projects and pure movement/rotation are strict no-ops. */
export function resizeScenePaint(
  before: MoldaSceneDocument,
  after: MoldaSceneDocument,
  initialize = false,
): MoldaSceneDocument {
  if (after.settings.texelsPerUnit !== 1 || !after.images.length) return after
  const oldIndex = indexSceneDocument(before),
    index = indexSceneDocument(after)
  let next = after
  for (const entry of after.nodes) {
    if (entry.kind !== 'mesh') continue
    const oldWorld = oldIndex.scene.worldMatrices.get(entry.id),
      world = index.scene.worldMatrices.get(entry.id)!
    if (!initialize && (!oldWorld || sameMetric(oldWorld, world))) continue
    let usage = sceneAppearanceUsage(next)
    let node = usage.index.scene.nodes.get(entry.id)!
    if (node.kind !== 'mesh') continue
    let geometry = usage.index.geometries.get(node.geometryId)!
    const used = new Set(
      Object.values(sceneGeometryMesh(geometry).faces).map((f) => f.materialId ?? entry.materialId),
    )
    for (const originalId of used) {
      let material = usage.index.materials.get(originalId)!
      if (!material.colorImageId) continue
      const originalImage = usage.index.images.get(material.colorImageId)!
      if (originalImage.texelsPerUnit !== undefined && originalImage.texelsPerUnit !== 1) continue
      if (
        (usage.materials.get(originalId)?.length ?? 0) > 1 ||
        SCENE_MATERIAL_IMAGE_KEYS.some(
          (key) =>
            material[key] &&
            ((usage.images.get(material[key]!)?.size ?? 0) > 1 ||
              next.materials.some(
                (other) =>
                  other.id !== material.id &&
                  SCENE_MATERIAL_IMAGE_KEYS.some((field) => other[field] === material[key]),
              )),
        )
      ) {
        next = copySceneMaterialForNode(next, entry.id, originalId)
        usage = sceneAppearanceUsage(next)
        material = next.materials.at(-1)!
        node = usage.index.scene.nodes.get(entry.id)!
        requireScene(node.kind === 'mesh', 'node', 'Essa peça mudou.')
        geometry = usage.index.geometries.get(node.geometryId)!
      }
      const full = sceneGeometryMesh(geometry)
      const mesh = meshSymmetrySource(full)
      const defaultMaterial = node.materialId
      const faces = Object.entries(mesh.faces)
        .filter(([, f]) => (f.materialId ?? defaultMaterial) === material.id)
        .map(([id]) => id)
      const image = usage.index.images.get(material.colorImageId!)!
      const maps = SCENE_MATERIAL_IMAGE_KEYS.flatMap((key) =>
        material[key] ? [usage.index.images.get(material[key]!)!] : [],
      )
      requireScene(
        maps.every((map) => !map.flipbook),
        'images',
        'Esta pintura tem animação. Mantenha o tamanho da peça para preservar seus quadros.',
      )
      requireScene(
        maps.every((map) => map.width === image.width && map.height === image.height),
        'images',
        'Os mapas desta peça têm tamanhos diferentes. Ajuste-os juntos na folha de pintura.',
      )
      const subset = {
        ...mesh,
        faces: Object.fromEntries(faces.map((id) => [id, mesh.faces[id]!])),
      }
      // A primitive stores one affine UV per surface, even when pole seams split its topology.
      const groups = new Map<string, string[]>()
      if (geometry.kind !== 'mesh') {
        const surfaces = parametricMesh(geometry).surfaceByFace
        for (const id of faces) {
          const key = surfaces.get(id)!,
            list = groups.get(key) ?? []
          list.push(id)
          groups.set(key, list)
        }
      }
      const islands = geometry.kind === 'mesh' ? indexMeshUv(subset).islands : [...groups.values()]
      const plan = resizeMap(mesh, faces, image, world, islands)
      const replaced = new Set(maps.map((map) => map.id))
      const retainedBytes = next.images.reduce(
        (total, map) =>
          total +
          (replaced.has(map.id)
            ? 0
            : map.layers.reduce((bytes, layer) => bytes + layer.pixels.byteLength, 0)),
        0,
      )
      const replacementBytes = [...new Map(maps.map((map) => [map.id, map])).values()].reduce(
        (total, map) =>
          total +
          plan.image.width *
            plan.image.height *
            (map.encoding === 'rgba' ? 4 : 1) *
            map.layers.length,
        0,
      )
      requireScene(
        retainedBytes + replacementBytes <= SCENE_LIMITS.pixelBytes,
        'images',
        'Essa mudança ultrapassa o espaço para pintura.',
      )
      const changed = new Map(
        maps.map((map) => {
          const replacement = initialize
            ? reprojectScenePaint(map, mesh, plan.mesh, faces, plan.image.width, plan.image.height)
            : map.id === image.id
              ? plan.image
              : resizeMap(mesh, faces, map, world, islands).image
          return [map.id, replacement] as const
        }),
      )
      let mapped = plan.mesh
      if (full.symmetry) {
        const combined = { ...full.faces, ...mapped.faces }
        for (const [source, reflected] of Object.entries(full.symmetry.faces)) {
          const face = full.faces[reflected]!,
            corners = [...mapped.faces[source]!.corners].reverse()
          combined[reflected] = {
            ...face,
            corners: face.corners.map((corner, i) => ({ ...corner, uv: corners[i]!.uv })),
          }
        }
        mapped = { ...full, faces: combined }
      }
      let updated = withUv(geometry, mapped)
      if (
        next.nodes.some(
          (other) =>
            other.id !== entry.id && other.kind === 'mesh' && other.geometryId === geometry.id,
        )
      ) {
        updated = { ...updated, id: allocateSceneId(next, newId)() }
        next = {
          ...next,
          nodes: next.nodes.map((other) =>
            other.id === entry.id && other.kind === 'mesh'
              ? { ...other, geometryId: updated.id }
              : other,
          ),
          geometries: [...next.geometries, updated],
        }
      } else
        next = {
          ...next,
          geometries: next.geometries.map((g) => (g.id === updated.id ? updated : g)),
        }
      next = { ...next, images: next.images.map((map) => changed.get(map.id) ?? map) }
      geometry = updated
      usage = sceneAppearanceUsage(next)
    }
  }
  return next === after ? after : finishSceneCommand(next)
}

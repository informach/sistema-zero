/**
 * Adaptador entre uma face 3D e um canvas de pixels. Índice 0 continua sendo
 * "cor base da peça"; a máscara só permite tinta dentro da forma visível.
 */
import type { FaceId, MoldaModelAsset, MoldaPart, MoldaSkin, Vec3 } from '../core/model'
import { faceUvToPoint, planarFaceFrame } from '../model/frame'
import { faceVertices, isMeshFaceKey } from '../model/mesh'
import { faceLocalPolygon, polygonContains } from '../model/meshFrame'
import { pickTexelAtPoint, type TexelHit } from '../model/pick'
import { faceSkinSize, partSize } from '../model/shapes'
import { cloneSkin, createSkin } from '../model/skinOps'
import { partMatrix, transformPoint } from '../model/transform'
import { MIRRORED_FACE } from '../model/twins'
import { type BrushSize, lineTexels, stampTexels } from './skinPaint'

export interface FacePaintTarget {
  /** Sempre aponta para a peça fonte; `flipX` preserva a orientação de um gêmeo tocado. */
  partId: string
  face: FaceId
  flipX: boolean
}

export interface FacePaintCanvas {
  width: number
  height: number
  data: Uint8Array
  mask: Uint8Array
  baseColor: number
}

/** Resolve também alvos externos que ainda apontem para um gêmeo. */
export function resolveFacePaintTarget(
  model: Pick<MoldaModelAsset, 'parts'>,
  target: FacePaintTarget,
): FacePaintTarget | null {
  const part = model.parts.find((item) => item.id === target.partId)
  if (!part) return null
  if (!part.mirrorOf) return target
  const source = model.parts.find((item) => item.id === part.mirrorOf)
  if (!source) return null
  return {
    partId: source.id,
    face: MIRRORED_FACE[target.face] ?? target.face,
    flipX: !target.flipX,
  }
}

function texelInside(part: MoldaPart, face: FaceId, u: number, v: number): boolean {
  const frame = planarFaceFrame(part, face)
  if (!frame) return true
  if (part.shape === 'mesh') {
    if (!part.mesh || !isMeshFaceKey(face)) return false
    const points = faceVertices(part.mesh, face)
    return points ? polygonContains(faceLocalPolygon(frame, points), [u, v], 0) : false
  }
  if (part.shape === 'wedge' && face === 'px') return u + v >= 1
  if (part.shape === 'wedge' && face === 'nx') return v >= u
  if (part.shape === 'cylinder' && (face === 'top' || face === 'bottom')) {
    const x = u * 2 - 1
    const y = v * 2 - 1
    return x * x + y * y <= 1
  }
  return true
}

export function facePaintMask(
  part: MoldaPart,
  face: FaceId,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (texelInside(part, face, (x + 0.5) / width, (y + 0.5) / height)) {
        mask[y * width + x] = 1
      }
    }
  }
  return mask
}

export function facePaintCanvas(
  model: Pick<MoldaModelAsset, 'parts' | 'texelsPerUnit'>,
  requested: FacePaintTarget,
): FacePaintCanvas | null {
  const target = resolveFacePaintTarget(model, requested)
  const part = target ? model.parts.find((item) => item.id === target.partId) : undefined
  if (!target || !part || part.mirrorOf) return null
  const size = faceSkinSize(part, target.face, model.texelsPerUnit)
  if (!size) return null
  const skin = part.faces[target.face]
  return {
    width: size.width,
    height: size.height,
    data:
      skin && skin.width === size.width && skin.height === size.height
        ? skin.data
        : new Uint8Array(size.width * size.height),
    mask: facePaintMask(part, target.face, size.width, size.height),
    baseColor: part.color,
  }
}

function sameSkin(a: MoldaSkin, b: MoldaSkin): boolean {
  if (a.width !== b.width || a.height !== b.height) return false
  return a.data.every((value, index) => value === b.data[index])
}

function withSkin(
  model: MoldaModelAsset,
  part: MoldaPart,
  face: FaceId,
  skin: MoldaSkin,
): MoldaModelAsset {
  const faces = { ...part.faces, [face]: skin }
  const next = { ...part, faces }
  return { ...model, parts: model.parts.map((item) => (item.id === part.id ? next : item)) }
}

function skinAndMask(
  model: MoldaModelAsset,
  hit: TexelHit,
  provided?: Uint8Array,
): { part: MoldaPart; skin: MoldaSkin; mask: Uint8Array } | null {
  const part = model.parts.find((item) => item.id === hit.partId)
  if (!part || part.mirrorOf) return null
  const size = faceSkinSize(part, hit.face, model.texelsPerUnit)
  if (!size) return null
  const current = part.faces[hit.face]
  const skin =
    current && current.width === size.width && current.height === size.height
      ? current
      : createSkin(size.width, size.height)
  const mask =
    provided?.length === skin.data.length
      ? provided
      : facePaintMask(part, hit.face, skin.width, skin.height)
  return { part, skin, mask }
}

export function facePaintSegment(
  model: MoldaModelAsset,
  from: TexelHit | null,
  to: TexelHit,
  color: number,
  size: BrushSize,
  providedMask?: Uint8Array,
): MoldaModelAsset {
  const context = skinAndMask(model, to, providedMask)
  if (!context) return model
  const sameFace = from?.partId === to.partId && from.face === to.face
  const line =
    sameFace && from ? lineTexels(from.x, from.y, to.x, to.y) : [[to.x, to.y] as [number, number]]
  let next: MoldaSkin | null = null
  for (const [tx, ty] of line) {
    for (const [x, y] of stampTexels(tx, ty, size)) {
      if (x < 0 || y < 0 || x >= context.skin.width || y >= context.skin.height) continue
      const index = y * context.skin.width + x
      if (!context.mask[index] || (next ?? context.skin).data[index] === color) continue
      if (!next) next = cloneSkin(context.skin)
      next.data[index] = color
    }
  }
  return next ? withSkin(model, context.part, to.face, next) : model
}

export function facePaintFill(
  model: MoldaModelAsset,
  hit: TexelHit,
  color: number,
  providedMask?: Uint8Array,
): MoldaModelAsset {
  const context = skinAndMask(model, hit, providedMask)
  if (!context) return model
  if (hit.x < 0 || hit.y < 0 || hit.x >= context.skin.width || hit.y >= context.skin.height)
    return model
  const first = hit.y * context.skin.width + hit.x
  if (!context.mask[first]) return model
  const target = context.skin.data[first] ?? 0
  if (target === color) return model
  const next = cloneSkin(context.skin)
  const stack: Array<[number, number]> = [[hit.x, hit.y]]
  while (stack.length > 0) {
    const point = stack.pop()
    if (!point) break
    const [x, y] = point
    if (x < 0 || y < 0 || x >= next.width || y >= next.height) continue
    const index = y * next.width + x
    if (!context.mask[index] || next.data[index] !== target) continue
    next.data[index] = color
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return sameSkin(context.skin, next) ? model : withSkin(model, context.part, hit.face, next)
}

/** Remove tinta que uma rotação retangular tenha levado para fora do polígono. */
export function clearOutsideFace(
  model: MoldaModelAsset,
  hit: TexelHit,
  providedMask?: Uint8Array,
): MoldaModelAsset {
  const context = skinAndMask(model, hit, providedMask)
  if (!context) return model
  let next: MoldaSkin | null = null
  for (let index = 0; index < context.skin.data.length; index += 1) {
    if (context.mask[index] || context.skin.data[index] === 0) continue
    if (!next) next = cloneSkin(context.skin)
    next.data[index] = 0
  }
  return next ? withSkin(model, context.part, hit.face, next) : model
}

function localPointAt(part: MoldaPart, face: FaceId, u: number, v: number): Vec3 | null {
  const frame = planarFaceFrame(part, face)
  if (frame) return faceUvToPoint(frame, u, v)
  const [sx, sy, sz] = partSize(part)
  const cx = part.from[0] + sx / 2
  const cy = part.from[1] + sy / 2
  const cz = part.from[2] + sz / 2
  const theta = u * Math.PI * 2
  if (part.shape === 'cylinder' && face === 'side') {
    return [
      cx + (Math.sin(theta) * sx) / 2,
      part.from[1] + (1 - v) * sy,
      cz + (Math.cos(theta) * sz) / 2,
    ]
  }
  if (part.shape === 'sphere' && face === 'around') {
    const phi = v * Math.PI
    const ring = Math.sin(phi)
    return [
      cx + (Math.sin(theta) * ring * sx) / 2,
      cy + (Math.cos(phi) * sy) / 2,
      cz + (Math.cos(theta) * ring * sz) / 2,
    ]
  }
  return null
}

/** Texel correspondente ao refletir o centro do texel em x = 0. */
export function mirrorFaceTexel(
  model: Pick<MoldaModelAsset, 'parts' | 'texelsPerUnit'>,
  hit: TexelHit,
): TexelHit | null {
  const part = model.parts.find((item) => item.id === hit.partId)
  const size = part ? faceSkinSize(part, hit.face, model.texelsPerUnit) : null
  if (!part || !size) return null
  const local = localPointAt(
    part,
    hit.face,
    (hit.x + 0.5) / size.width,
    (hit.y + 0.5) / size.height,
  )
  if (!local) return null
  const world = transformPoint(partMatrix(part), local)
  const reachable = {
    ...model,
    parts: model.parts.filter((item) => !item.hidden && !item.locked),
  }
  return pickTexelAtPoint(reachable, [-world[0], world[1], world[2]])
}

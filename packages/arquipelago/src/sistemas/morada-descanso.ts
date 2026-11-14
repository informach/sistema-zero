import {
  AVATAR_CATALOG,
  bodyMeasures,
  physicalBody,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaPiece,
  type MoradaVector,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { moradaTransform, rotateMorada } from './morada'

export type MoradaRest = { instanceId: string; mode: 'sentar' | 'deitar' }

export function moradaRestModes(piece: MoradaPiece): Array<MoradaRest['mode']> {
  const names = Object.keys(piece.points)
  return [
    ...(piece.category === 'cadeiras' ||
    piece.category === 'sofas' ||
    names.some((n) => /sentar|assento/.test(n))
      ? ['sentar' as const]
      : []),
    ...(piece.category === 'camas' || names.some((n) => /deitar|cama/.test(n))
      ? ['deitar' as const]
      : []),
  ]
}

/** O ponto elevado é do assento; pontos no chão são de aproximação, não de sentar. */
export function moradaRestPose(
  house: MoradaHouse,
  instance: MoradaInstance,
  mode: MoradaRest['mode'],
) {
  const piece = MORADA_CATALOG.pieces[instance.pieceId]
  if (!piece || !moradaRestModes(piece).includes(mode)) return null
  const transform = moradaTransform(house, instance)
  const authored = Object.entries(piece.points).find(
    ([name, p]) =>
      (mode === 'sentar' ? /sentar|assento/ : /deitar|cama/).test(name) && p.position[1] > 0,
  )
  const surface = piece.colliders.find((c) => c.size[0] > 0.2 && c.size[2] > 0.2)
  if (!authored && !surface) return null
  const point: MoradaVector = authored?.[1].position ?? [
    surface!.center[0],
    surface!.center[1] + surface!.size[1] / 2,
    surface!.center[2],
  ]
  const rotated = rotateMorada(point, transform.rotation)
  const clip = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === 'sentado')!
  const seatHeight = Number(clip.place?.assento_m)
  const visual: MoradaVector = [
    transform.position[0] + rotated[0],
    transform.position[1] + rotated[1] - (mode === 'sentar' ? seatHeight : 0),
    transform.position[2] + rotated[2],
  ]
  const direction = authored?.[1].direction
  const rotation = transform.rotation + (direction ? Math.atan2(direction[0], direction[2]) : 0)
  const body = physicalBody(bodyMeasures(AVATAR_CATALOG.base.skeleton, 1))
  const cx = (piece.min[0] + piece.max[0]) / 2,
    cz = (piece.min[2] + piece.max[2]) / 2
  const clearance = body.radius + 0.12
  const local: MoradaVector[] = [
    [cx, body.centerToFoot + 0.06, piece.max[2] + clearance],
    [piece.max[0] + clearance, body.centerToFoot + 0.06, cz],
    [piece.min[0] - clearance, body.centerToFoot + 0.06, cz],
    [cx, body.centerToFoot + 0.06, piece.min[2] - clearance],
  ]
  const candidates = local.map((p) => {
    const q = rotateMorada(p, transform.rotation)
    return q.map((v, i) => v + transform.position[i]!) as MoradaVector
  })
  return { visual, rotation, candidates }
}

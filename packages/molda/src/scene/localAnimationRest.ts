import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

/** Keep absolute local keys aligned when a piece's rest size or position changes. */
export function changeSceneRestWithLocalAnimations(
  document: MoldaSceneDocument,
  nodes: MoldaSceneDocument['nodes'],
  changedIds: ReadonlySet<string>,
): MoldaSceneDocument {
  if (!document.animations?.some((clip) => clip.space === 'local')) return { ...document, nodes }
  const before = new Map(document.nodes.map((node) => [node.id, node]))
  const after = new Map(nodes.map((node) => [node.id, node]))
  const changes = new Map<string, { shift: Vec3; ratio: Vec3 }>()
  const adjustment = (id: string) => {
    const cached = changes.get(id)
    if (cached) return cached
    const oldTransform = before.get(id)?.transform
    const newTransform = after.get(id)?.transform
    requireScene(
      oldTransform?.kind === 'trs' && newTransform?.kind === 'trs',
      `nodes.${id}`,
      'Esse clipe usa a posição local original. O novo tamanho precisa manter os eixos da peça.',
    )
    const alignment = Math.abs(
      oldTransform.rotation.reduce(
        (sum, value, axis) => sum + value * newTransform.rotation[axis]!,
        0,
      ),
    )
    requireScene(
      Math.abs(1 - alignment) < 1e-8,
      `nodes.${id}`,
      'Esse clipe usa a posição local original. Converta o movimento antes de girar a peça.',
    )
    const shift = newTransform.translation.map(
      (value, axis) => value - oldTransform.translation[axis]!,
    ) as Vec3
    const ratio = newTransform.scale.map((value, axis) => value / oldTransform.scale[axis]!) as Vec3
    requireScene(
      [...shift, ...ratio].every(Number.isFinite),
      `nodes.${id}`,
      'Esse tamanho não permite preservar as chaves da animação.',
    )
    const result = { shift, ratio }
    changes.set(id, result)
    return result
  }
  let changed = false
  const animations = document.animations.map((clip) => {
    if (clip.space !== 'local') return clip
    let clipChanged = false
    const tracks = clip.tracks.map((track) => {
      if (!changedIds.has(track.nodeId)) return track
      const { shift, ratio } = adjustment(track.nodeId)
      if (track.channel === 'rotation') return track
      const factors = track.channel === 'scale' ? ratio : shift
      if (factors.every((value) => value === (track.channel === 'scale' ? 1 : 0))) return track
      clipChanged = true
      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          value: key.value.map((value, axis) =>
            track.channel === 'scale' ? value * ratio[axis]! : value + shift[axis]!,
          ) as Vec3,
        })),
      }
    })
    if (!clipChanged) return clip
    changed = true
    return { ...clip, tracks }
  })
  return changed ? { ...document, nodes, animations } : { ...document, nodes }
}

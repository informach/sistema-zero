import type { MoldaSceneDocument } from './document'
import type { SceneIndex } from './graph'
import { SCENE_LIMITS } from './limits'
import { requireScene, uniqueById } from './validation'

/** Validated authorial key values are not scanned again in geometry/paint command indices. */
export function indexSceneAnimations(
  document: MoldaSceneDocument,
  scene: SceneIndex<MoldaSceneDocument['nodes'][number]>,
) {
  const animations = uniqueById(document.animations ?? [], 'animations')
  requireScene(
    animations.size <= SCENE_LIMITS.animationClips,
    'animations',
    'Há clipes demais nesta criação.',
  )
  const animatedNodes = new Set<string>()
  let tracks = 0
  let keys = 0
  for (const clip of animations.values()) {
    const pairs = new Set<string>()
    tracks += clip.tracks.length
    requireScene(
      tracks <= SCENE_LIMITS.animationTracks,
      'animations',
      'Há trilhas demais nesta criação.',
    )
    for (const track of clip.tracks) {
      const path = `animations.${clip.id}.${track.nodeId}.${track.channel}`
      const node = scene.nodes.get(track.nodeId)
      requireScene(node, path, 'A peça animada não existe.')
      requireScene(
        clip.space !== 'local' || node.transform.kind === 'trs',
        path,
        'Esse clipe usa a posição local original. Converta o movimento antes de mudar a organização ou o pivô.',
      )
      const pair = JSON.stringify([track.nodeId, track.channel])
      requireScene(!pairs.has(pair), path, 'Essa peça já tem uma trilha desse movimento.')
      pairs.add(pair)
      animatedNodes.add(track.nodeId)
      keys += track.keys.length
      requireScene(
        track.keys.length > 0 && keys <= SCENE_LIMITS.animationKeys,
        path,
        'Chaves fora do orçamento da criação.',
      )
    }
  }
  return { animations, animatedNodes, animationTrackCount: tracks, animationKeyCount: keys }
}

/** Static intermediate groups may change; animated ancestor order must not change without bake. */
export function requireSceneAnimationReparent(
  scene: SceneIndex<MoldaSceneDocument['nodes'][number]>,
  animatedNodes: ReadonlySet<string>,
  roots: ReadonlySet<string>,
  parentId: string | null,
) {
  if (!animatedNodes.size) return
  const ancestors = (id: string | null) => {
    const result: string[] = []
    for (let current = id; current !== null; ) {
      const node = scene.nodes.get(current)
      requireScene(node, 'parentId', 'O grupo escolhido não existe.')
      if (animatedNodes.has(current)) result.push(current)
      current = node.parentId
    }
    return JSON.stringify(result)
  }
  const target = ancestors(parentId)
  for (const id of roots) {
    const node = scene.nodes.get(id)
    requireScene(node, `nodes.${id}`, 'A peça escolhida não existe.')
    requireScene(
      ancestors(node.parentId) === target,
      `nodes.${id}`,
      'Essa mudança altera o movimento herdado de um grupo. Converta o movimento antes de reorganizar.',
    )
  }
}

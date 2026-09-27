import type { Vec3 } from '../core/model'
import { sceneAnimationContext } from './animationCommandContext'
import type { SceneAnimationKeyInput } from './animationCommands'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { captureSceneAnimationLocalPose } from './animationPose'
import { animationTrs } from './animationTrs'
import { readSceneBendLimit } from './bendLimit'
import type { MoldaSceneDocument } from './document'
import { sameSceneContent } from './documentContent'
import { SCENE_LIMITS } from './limits'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  type Quaternion,
  transformDirection,
  transformPoint,
} from './matrix'
import { rotationBetweenDirections } from './rotationBetweenDirections'
import { prepareSceneAnimationRotationPreview, type SceneAnimationPose } from './sampleAnimation'
import { solveTwoBoneReach, type TwoBoneReach } from './twoBoneReach'
import { list, requireScene, tuple, id as validateId } from './validation'

export interface SceneTwoBonePoseFrame {
  pose: SceneAnimationPose
  /** Reach is measured in the root parent's Euclidean frame, not world units under affine scale. */
  reach: Pick<TwoBoneReach, 'status' | 'bend' | 'direction'>
}

type RotationKey = Extract<SceneAnimationKeyInput, { channel: 'rotation' }>

function position(matrix: Readonly<AffineMatrix>): Vec3 {
  return [matrix[12], matrix[13], matrix[14]]
}
function difference(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function inverse(matrix: Readonly<AffineMatrix>): AffineMatrix {
  const result = affineInverse(matrix)
  requireScene(
    result,
    'pose',
    'Esse ajuste precisa de eixos com tamanho e precisão suficientes. A pose original não mudou.',
  )
  return result
}
function around(point: Vec3, rotation: Quaternion): AffineMatrix {
  const matrix = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation,
      scale: [1, 1, 1],
    }),
    rotated = transformDirection(matrix, point)
  matrix[12] = point[0] - rotated[0]
  matrix[13] = point[1] - rotated[1]
  matrix[14] = point[2] - rotated[2]
  return matrix
}

/** Prepared rotation-only two-bone pose. No document edits until an owned frame is explicitly committed. */
export function prepareSceneTwoBonePose(
  document: MoldaSceneDocument,
  clipId: string,
  chain: readonly [string, string, string],
  time: number,
) {
  const ids = list(chain, 'chain', 3).map((id) => validateId(id, 'chain'))
  requireScene(
    ids.length === 3 && new Set(ids).size === 3,
    'chain',
    'Escolha três apoios diferentes: começo, dobra e ponta.',
  )
  const { clip, index, editable } = sceneAnimationContext(document, clipId),
    nodes = ids.map((id) => index.scene.nodes.get(id))
  for (const [i, node] of nodes.entries())
    requireScene(
      node && node.kind !== 'mesh' && (i === 0 || node.parentId === ids[i - 1]),
      'chain',
      'Os três apoios precisam estar ligados em sequência direta.',
    )
  editable(ids)
  const [rootId, middleId] = ids as [string, string, string],
    preview = prepareSceneAnimationRotationPreview(document, clipId, [rootId, middleId], time),
    captured = preview.original,
    parentId = nodes[0]!.parentId,
    parent = parentId === null ? identityMatrix() : captured.worldMatrices.get(parentId)!,
    parentInverse = inverse(parent),
    matrices = ids.map((id) => affineMultiply(parentInverse, captured.worldMatrices.get(id)!)),
    [root, middle, tip] = matrices.map(position) as [Vec3, Vec3, Vec3],
    references = new Map(
      [rootId, middleId].map((id) => [
        id,
        captureSceneAnimationLocalPose(document, clipId, id, time),
      ]),
    ),
    bases = new Map(
      [rootId, middleId].map((id) => [id, composeTransform(index.scene.nodes.get(id)!.transform)]),
    ),
    baseInverses = new Map(
      [...bases].map(([id, base]) => [
        id,
        clip.space === 'local-delta' ? inverse(base) : identityMatrix(),
      ]),
    ),
    destinations = new Map(
      [rootId, middleId].map((id) => {
        const track = clip.tracks.find(
          (track) => track.nodeId === id && track.channel === 'rotation',
        )
        return [
          id,
          {
            exists: !!track,
            interpolation: track?.keys.find((key) => key.time === time)?.interpolation,
          },
        ]
      }),
    ),
    limitNode = nodes[1]!,
    limit =
      limitNode.kind !== 'mesh' && limitNode.bendLimit !== undefined
        ? readSceneBendLimit(limitNode.bendLimit)
        : undefined,
    initialReach = solveTwoBoneReach({ root, middle, tip, target: tip }),
    lengths = [Math.hypot(...difference(middle, root)), Math.hypot(...difference(tip, middle))],
    owned = new WeakMap<
      SceneTwoBonePoseFrame,
      { keys: RotationKey[]; target?: Vec3; hint?: Vec3 }
    >()
  let active = true
  function requireActive() {
    requireScene(active, 'pose', 'Esse ajuste foi encerrado. Comece uma nova prévia.')
  }
  function frame(
    rotations: ReadonlyMap<string, Quaternion>,
    reach: TwoBoneReach,
    input?: { target: Vec3; hint?: Vec3 },
  ): SceneTwoBonePoseFrame {
    const keys: RotationKey[] = []
    let addedTracks = 0,
      addedKeys = 0
    for (const [nodeId, rotation] of rotations) {
      if (rotation.every((n, i) => n === references.get(nodeId)!.rotation[i])) continue
      const destination = destinations.get(nodeId)!
      if (!destination.exists) addedTracks++
      if (destination.interpolation === undefined) addedKeys++
      keys.push({
        nodeId,
        channel: 'rotation',
        key: { time, value: [...rotation], interpolation: destination.interpolation ?? 'linear' },
      })
    }
    requireScene(
      index.animationTrackCount + addedTracks <= SCENE_LIMITS.animationTracks &&
        index.animationKeyCount + addedKeys <= SCENE_LIMITS.animationKeys,
      'keys',
      'Essa pose ultrapassa o orçamento de movimentos da criação.',
    )
    const result: SceneTwoBonePoseFrame = {
      pose: {
        ...preview.sample(new Map(keys.map((key) => [key.nodeId, key.key.value]))),
        ...(input
          ? {
              twoBoneGuide: {
                chain: [...ids] as [string, string, string],
                target: [...input.target] as Vec3,
              },
            }
          : {}),
      },
      reach: { status: reach.status, bend: reach.bend, direction: reach.direction },
    }
    owned.set(result, {
      keys,
      ...(input
        ? { target: [...input.target], hint: input.hint ? [...input.hint] : undefined }
        : {}),
    })
    return result
  }
  function keys(frame: SceneTwoBonePoseFrame): SceneAnimationKeyInput[] {
    requireActive()
    const result = owned.get(frame)
    requireScene(result, 'pose', 'A pose pertence a outro ajuste.')
    return structuredClone(result.keys)
  }
  function rotationFor(nodeId: string, local: AffineMatrix) {
    const reference = references.get(nodeId)!,
      animated = affineMultiply(baseInverses.get(nodeId)!, local)
    return animationTrs(animated, reference).rotation
  }
  const original = frame(new Map(), initialReach)
  return {
    original,
    keys,
    cancel() {
      active = false
    },
    commit(frame: SceneTwoBonePoseFrame, current: MoldaSceneDocument) {
      const changes = keys(frame)
      requireScene(
        sameSceneContent(document, current),
        'pose',
        'A criação mudou. Comece uma nova prévia antes de gravar.',
      )
      return setSceneAnimationKeys(current, clipId, changes)
    },
    translate(frame: SceneTwoBonePoseFrame, offsetInput: Vec3) {
      requireActive()
      const input = owned.get(frame),
        offset = tuple(offsetInput, 3, 'offset') as Vec3
      requireScene(input?.target, 'pose', 'Comece uma prévia antes de arrastar seu destino.')
      const target = input.target.map((value, i) => {
        const next = value + offset[i]!
        requireScene(
          offset[i] === 0 || next !== value,
          'offset',
          'Esse deslocamento é pequeno demais para a precisão do destino.',
        )
        return next
      }) as Vec3
      return sample(target, input.hint)
    },
    sample,
  }
  function sample(targetInput: Vec3, hintInput?: Vec3): SceneTwoBonePoseFrame {
    requireActive()
    const input = {
        target: tuple(targetInput, 3, 'target') as Vec3,
        hint: hintInput === undefined ? undefined : (tuple(hintInput, 3, 'hint') as Vec3),
      },
      target = transformPoint(parentInverse, input.target),
      hint = input.hint === undefined ? undefined : transformPoint(parentInverse, input.hint),
      reach = solveTwoBoneReach({ root, middle, tip, target, hint, limit })
    if (reach.middle.every((n, i) => n === middle[i]) && reach.tip.every((n, i) => n === tip[i]))
      return frame(new Map(), reach, input)
    const rootRotation = rotationBetweenDirections(
        difference(middle, root),
        difference(reach.middle, root),
      ),
      rootDelta = around(root, rootRotation),
      nextRoot = affineMultiply(rootDelta, matrices[0]!),
      inheritedMiddle = affineMultiply(rootDelta, matrices[1]!),
      inheritedTip = transformPoint(rootDelta, tip),
      middleRotation = rotationBetweenDirections(
        difference(inheritedTip, reach.middle),
        difference(reach.tip, reach.middle),
      ),
      middleDelta = around(reach.middle, middleRotation),
      nextMiddle = affineMultiply(middleDelta, inheritedMiddle),
      rotations = new Map<string, Quaternion>()
    if (rootRotation.some((n, i) => n !== (i === 3 ? 1 : 0)))
      rotations.set(rootId, rotationFor(rootId, nextRoot))
    if (middleRotation.some((n, i) => n !== (i === 3 ? 1 : 0)))
      rotations.set(middleId, rotationFor(middleId, affineMultiply(inverse(nextRoot), nextMiddle)))
    const result = frame(rotations, reach, input),
      expected = [nextRoot, nextMiddle],
      tolerance = 2048 * Number.EPSILON
    // Rebuild with the untouched translation/scale channels, not with the decomposed values.
    for (let i = 0; i < 2; i++) {
      const actual = affineMultiply(parentInverse, result.pose.worldMatrices.get(ids[i]!)!),
        wanted = expected[i]!
      for (let column = 0; column < 3; column++) {
        const size = Math.hypot(
          wanted[column * 4]!,
          wanted[column * 4 + 1]!,
          wanted[column * 4 + 2]!,
        )
        requireScene(
          size > 0 &&
            [0, 1, 2].every(
              (row) =>
                Math.abs((actual[column * 4 + row]! - wanted[column * 4 + row]!) / size) <=
                tolerance,
            ),
          'pose',
          'Essa dobra não cabe só em rotações. Posição, tamanho e eixos originais foram preservados.',
        )
      }
    }
    for (const [i, wanted] of [root, reach.middle, reach.tip].entries()) {
      const actual = transformPoint(
          parentInverse,
          position(result.pose.worldMatrices.get(ids[i]!)!),
        ),
        error = Math.hypot(...difference(actual, wanted)),
        size = lengths[Math.max(0, i - 1)]!
      requireScene(
        error / size <= tolerance,
        'pose',
        'Não foi possível preservar a articulação com essa precisão. A pose original não mudou.',
      )
    }
    return result
  }
}

import { newId } from '../core/id'
import { allocateSceneId, finishSceneCommand, sceneCommandSelection } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding, type SceneSkinInfluence } from './skin'
import { bindSceneSkin, type SceneSkinBindInput } from './skinBinding'
import { captureSceneSkinJoint, sceneSkinJointUsage } from './skinJoints'
import { patchSceneSkinWeights } from './skinWeightPatch'
import * as v from './validation'

function context(document: MoldaSceneDocument, skinId: string) {
  const index = indexSceneDocument(document),
    skin = index.skins.get(v.id(skinId, 'skinId'))
  v.requireScene(skin, 'skinId', 'Esse vínculo não existe mais. Escolha novamente.')
  v.requireScene(
    !evaluateSceneNodeFlags(index.scene).get(skin.nodeId)?.locked,
    'skinId',
    'Destrave a peça para mudar seu vínculo.',
  )
  return { skin, index }
}

function replace(document: MoldaSceneDocument, skin: SceneSkinBinding) {
  return finishSceneCommand({
    ...document,
    skins: document.skins!.map((entry) => (entry.id === skin.id ? skin : entry)),
  })
}

/** Explicit rest capture. A binding belongs to the mesh instance, not its shared geometry. */
export function createSceneSkin(
  document: MoldaSceneDocument,
  input: Omit<SceneSkinBindInput, 'id'>,
  nextId = newId,
) {
  v.record(input, 'bind', ['name', 'nodeId', 'jointIds', 'weights'])
  const selected = sceneCommandSelection(document, [v.id(input.nodeId, 'nodeId')])
  v.requireScene(
    !selected.locked.has(input.nodeId),
    'nodeId',
    'Destrave a peça para mudar seu vínculo.',
  )
  v.requireScene(
    !selected.index.skinsByNode.has(input.nodeId),
    'nodeId',
    'Esta peça já tem um vínculo de esqueleto.',
  )
  v.requireScene(
    selected.index.skins.size < SCENE_SKIN_LIMITS.bindings,
    'skins',
    'Há vínculos demais nesta criação.',
  )
  const count = Object.keys(v.record(input.weights, 'weights')).length
  v.requireScene(
    selected.index.skinVertexCount + count <= SCENE_SKIN_LIMITS.weightedVertices,
    'weights',
    'Os pontos vinculados ultrapassam o orçamento da criação.',
  )
  const skin = bindSceneSkin(document, { ...input, id: allocateSceneId(document, nextId)() })
  return finishSceneCommand({ ...document, skins: [...(document.skins ?? []), skin] })
}

export function removeSceneSkin(document: MoldaSceneDocument, skinId: string) {
  const { skin } = context(document, skinId)
  return finishSceneCommand({
    ...document,
    skins: document.skins!.filter((entry) => entry !== skin),
  })
}

export function renameSceneSkin(document: MoldaSceneDocument, skinId: string, name: string) {
  const { skin } = context(document, skinId),
    valid = v.text(name.trim(), 'name', 48)
  return skin.name === valid ? document : replace(document, { ...skin, name: valid })
}

/** Rebinding is a separate command, never a side effect of reading or moving a joint. */
export function rebindSceneSkin(document: MoldaSceneDocument, skinId: string) {
  const { skin } = context(document, skinId),
    captured = bindSceneSkin(document, {
      id: skin.id,
      name: skin.name,
      nodeId: skin.nodeId,
      jointIds: skin.joints.map((joint) => joint.nodeId),
      weights: skin.weights,
    })
  const joints = captured.joints.map((joint, i) =>
    joint.inverseBindMatrix.every((value, j) => value === skin.joints[i]!.inverseBindMatrix[j])
      ? skin.joints[i]!
      : joint,
  )
  return joints.every((joint, i) => joint === skin.joints[i])
    ? document
    : replace(document, { ...skin, joints })
}

/** Atomic, sparse weight edit. Normalization is opt-in and never drops influences. */
export function setSceneSkinWeights(
  document: MoldaSceneDocument,
  skinId: string,
  patch: Record<string, SceneSkinInfluence[]>,
  options: { normalize?: boolean } = {},
) {
  const { skin } = context(document, skinId)
  v.record(patch, 'weights')
  v.record(options, 'options', ['normalize'])
  const normalize =
    options.normalize === undefined ? false : v.boolean(options.normalize, 'normalize')
  const next = patchSceneSkinWeights(skin, patch, normalize)
  return next === skin ? document : replace(document, next)
}

/** Add one authorial support without assigning weights, changing old binds, or moving anything. */
export function addSceneSkinJoint(document: MoldaSceneDocument, skinId: string, jointId: string) {
  const { skin, index } = context(document, skinId),
    nodeId = v.id(jointId, 'jointId'),
    node = index.scene.nodes.get(nodeId)
  v.requireScene(
    node && node.kind !== 'mesh',
    'jointId',
    'Escolha um grupo ou ponto de apoio existente.',
  )
  v.requireScene(
    !skin.joints.some((joint) => joint.nodeId === nodeId),
    'jointId',
    'Este osso já pertence ao vínculo.',
  )
  v.requireScene(
    skin.joints.length < SCENE_SKIN_LIMITS.joints,
    'jointId',
    'O vínculo chegou ao limite de ossos.',
  )
  const joint = captureSceneSkinJoint(
    nodeId,
    index.scene.worldMatrices.get(nodeId),
    index.scene.worldMatrices.get(skin.nodeId)!,
  )
  return replace(document, { ...skin, joints: [...skin.joints, joint] })
}

/** Explicit zero-slot cleanup only. Positive force must be reassigned by a separate weight edit. */
export function removeSceneSkinJoint(
  document: MoldaSceneDocument,
  skinId: string,
  jointId: string,
) {
  const { skin } = context(document, skinId),
    nodeId = v.id(jointId, 'jointId'),
    usage = sceneSkinJointUsage(skin).get(nodeId)
  v.requireScene(usage, 'jointId', 'Este osso não pertence ao vínculo.')
  v.requireScene(
    usage.positive === 0,
    'jointId',
    'Este osso ainda move pontos. Ajuste os pesos antes de retirá-lo.',
  )
  v.requireScene(skin.joints.length > 1, 'jointId', 'Use Desvincular para retirar o último osso.')
  const changes = Object.entries(skin.weights).flatMap(([id, influences]) =>
    influences.some((influence) => influence.jointId === nodeId)
      ? [[id, influences.filter((influence) => influence.jointId !== nodeId)] as const]
      : [],
  )
  return replace(document, {
    ...skin,
    joints: skin.joints.filter((joint) => joint.nodeId !== nodeId),
    weights: changes.length ? { ...skin.weights, ...Object.fromEntries(changes) } : skin.weights,
  })
}

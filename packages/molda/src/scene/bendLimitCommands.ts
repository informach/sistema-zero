import { readSceneBendLimit, type SceneBendLimit } from './bendLimit'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

/** Changes only the assistance rule. Existing transforms, weights and animation keys stay exact. */
export function setSceneBendLimit(
  document: MoldaSceneDocument,
  nodeId: string,
  input: SceneBendLimit | null,
) {
  const context = sceneCommandSelection(document, [nodeId]),
    node = context.index.scene.nodes.get(nodeId)
  requireScene(node && node.kind !== 'mesh', 'nodeId', 'Escolha um apoio para limitar a dobra.')
  requireEditableScene(context)
  const next = input === null ? null : readSceneBendLimit(input)
  if (next?.min === node.bendLimit?.min && next?.max === node.bendLimit?.max) return document
  const { bendLimit: _previous, ...rest } = node,
    replacement = next ? { ...rest, bendLimit: next } : rest
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((entry) => (entry.id === nodeId ? replacement : entry)),
  })
}

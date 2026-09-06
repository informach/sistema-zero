import type { MeshSelectMode } from '../../../state/sessionStore'

export type MeshCommandId =
  | 'merge'
  | 'createFace'
  | 'connect'
  | 'extrudeEdges'
  | 'loopCut'
  | 'extrudeFaces'
  | 'inset'
  | 'flip'
  | 'split'

export type MeshSelectionRequirement =
  | 'two-or-more-points'
  | 'three-or-four-points'
  | 'two-opposite-points'
  | 'one-or-more-edges'
  | 'one-edge'
  | 'one-or-more-faces'
  | 'one-face'
  | 'one-or-more-quads'

interface MeshCommandDefinition {
  id: MeshCommandId
  mode: MeshSelectMode
  requirement: MeshSelectionRequirement
}

const DEFINITIONS: readonly MeshCommandDefinition[] = [
  { id: 'merge', mode: 'vertex', requirement: 'two-or-more-points' },
  { id: 'createFace', mode: 'vertex', requirement: 'three-or-four-points' },
  { id: 'connect', mode: 'vertex', requirement: 'two-opposite-points' },
  { id: 'extrudeEdges', mode: 'edge', requirement: 'one-or-more-edges' },
  { id: 'loopCut', mode: 'edge', requirement: 'one-edge' },
  { id: 'extrudeFaces', mode: 'face', requirement: 'one-or-more-faces' },
  { id: 'inset', mode: 'face', requirement: 'one-face' },
  { id: 'flip', mode: 'face', requirement: 'one-or-more-faces' },
  { id: 'split', mode: 'face', requirement: 'one-or-more-quads' },
]

export interface MeshCommandState {
  enabled: boolean
  disabledMessage: string
  run: () => void
}

export interface MeshCommand extends MeshCommandDefinition, MeshCommandState {}

/** A caixa mostra somente os comandos que fazem sentido no modo ativo. */
export function contextualMeshCommands(
  mode: MeshSelectMode,
  states: Record<MeshCommandId, MeshCommandState>,
): MeshCommand[] {
  return DEFINITIONS.filter((definition) => definition.mode === mode).map((definition) => ({
    ...definition,
    ...states[definition.id],
  }))
}

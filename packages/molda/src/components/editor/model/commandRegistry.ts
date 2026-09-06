import { COPY } from '../../../core/copy'
import type { PaintTool } from '../../../paint/stroke'
import type { MeshSelectMode, TransformTool } from '../../../state/sessionStore'
import {
  ArrowUpFromLine,
  Box,
  Check,
  Circle,
  Copy,
  Cylinder,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  Focus,
  Frame,
  GitFork,
  Grid3x3,
  Hexagon,
  ImageIcon,
  Layers,
  type LucideIcon,
  Magnet,
  Merge,
  Minus,
  Move,
  PaintBucket,
  Paintbrush,
  Pencil,
  Pipette,
  Plus,
  RotateCw,
  Scaling,
  Scissors,
  Shrink,
  Square,
  SquarePlus,
  Trash2,
  Triangle,
} from '../../ui/icons'
import type { MeshCommandId } from './meshCommands'

export type ModelCommandContext =
  | 'build'
  | 'paint'
  | 'mesh-vertex'
  | 'mesh-edge'
  | 'mesh-face'
  | 'face-paint'

export interface ModelCommandShortcut {
  display: string
  keys: readonly string[]
  modifier?: 'primary'
}

export interface ModelCommandDefinition {
  id: string
  label: string
  icon: LucideIcon
  contexts: readonly ModelCommandContext[]
  shortcut?: ModelCommandShortcut
  help?: string
}

const key = (display: string, ...keys: string[]): ModelCommandShortcut => ({ display, keys })
const primary = (display: string, ...keys: string[]): ModelCommandShortcut => ({
  display,
  keys,
  modifier: 'primary',
})

const build = ['build'] as const
const paint = ['paint'] as const
const facePaint = ['face-paint'] as const
const allMesh = ['mesh-vertex', 'mesh-edge', 'mesh-face'] as const
const allMain = ['build', 'paint', ...allMesh] as const

const COMMAND_DEFINITIONS = [
  {
    id: 'add.box',
    label: `${COPY.editor.model.addGroup} caixa`,
    icon: Box,
    contexts: build,
    shortcut: key('B', 'b'),
  },
  {
    id: 'add.wedge',
    label: `${COPY.editor.model.addGroup} rampa`,
    icon: Triangle,
    contexts: build,
  },
  {
    id: 'add.cylinder',
    label: `${COPY.editor.model.addGroup} cilindro`,
    icon: Cylinder,
    contexts: build,
  },
  { id: 'add.sphere', label: `${COPY.editor.model.addGroup} bola`, icon: Circle, contexts: build },
  { id: 'add.mesh', label: `${COPY.editor.model.addGroup} malha`, icon: Hexagon, contexts: build },
  {
    id: 'tool.move',
    label: COPY.editor.model.tools.move,
    icon: Move,
    contexts: build,
    shortcut: key('V', 'v'),
  },
  {
    id: 'tool.rotate',
    label: COPY.editor.model.tools.rotate,
    icon: RotateCw,
    contexts: build,
    shortcut: key('R', 'r'),
  },
  {
    id: 'tool.scale',
    label: COPY.editor.model.tools.scale,
    icon: Scaling,
    contexts: build,
    shortcut: key('T', 't'),
  },
  {
    id: 'tool.snap',
    label: COPY.editor.model.tools.snap,
    icon: Magnet,
    contexts: build,
    shortcut: key('G', 'g'),
  },
  {
    id: 'part.duplicate',
    label: COPY.editor.model.duplicate,
    icon: Copy,
    contexts: build,
    shortcut: primary('Ctrl+D', 'd'),
  },
  {
    id: 'part.remove',
    label: COPY.editor.model.remove,
    icon: Trash2,
    contexts: build,
    shortcut: key('Delete', 'delete', 'backspace'),
  },
  {
    id: 'part.mesh',
    label: COPY.editor.model.mesh.open,
    icon: Hexagon,
    contexts: build,
    shortcut: key('E', 'e'),
  },
  {
    id: 'build.mirror',
    label: COPY.editor.model.mirror,
    icon: FlipHorizontal2,
    contexts: build,
    shortcut: key('M', 'm'),
  },
  { id: 'build.snap-half', label: COPY.editor.model.snapHalf, icon: Grid3x3, contexts: build },
  {
    id: 'build.additive',
    label: COPY.editor.model.partsAdditive,
    icon: Layers,
    contexts: build,
    shortcut: key('Shift', 'shift'),
  },
  {
    id: 'arrange.floor',
    label: COPY.editor.model.arrange.floor,
    icon: ArrowUpFromLine,
    contexts: build,
  },
  { id: 'arrange.center', label: COPY.editor.model.arrange.center, icon: Focus, contexts: build },
  {
    id: 'arrange.align-x',
    label: COPY.editor.model.arrange.alignAxis('X'),
    icon: Layers,
    contexts: build,
  },
  {
    id: 'arrange.align-y',
    label: COPY.editor.model.arrange.alignAxis('Y'),
    icon: Layers,
    contexts: build,
  },
  {
    id: 'arrange.align-z',
    label: COPY.editor.model.arrange.alignAxis('Z'),
    icon: Layers,
    contexts: build,
  },
  { id: 'arrange.repeat', label: COPY.editor.model.arrange.repeat, icon: Copy, contexts: build },
  {
    id: 'paint.pencil',
    label: COPY.editor.model.paint.tools.pencil,
    icon: Pencil,
    contexts: [...paint, ...facePaint],
    shortcut: key('P', 'p'),
  },
  {
    id: 'paint.eraser',
    label: COPY.editor.model.paint.tools.eraser,
    icon: Eraser,
    contexts: [...paint, ...facePaint],
    shortcut: key('E', 'e'),
  },
  {
    id: 'paint.fill-face',
    label: COPY.editor.model.paint.tools.fillFace,
    icon: PaintBucket,
    contexts: [...paint, ...facePaint],
    shortcut: key('G', 'g'),
  },
  {
    id: 'paint.fill-part',
    label: COPY.editor.model.paint.tools.fillPart,
    icon: Paintbrush,
    contexts: paint,
  },
  {
    id: 'paint.picker',
    label: COPY.editor.model.paint.tools.picker,
    icon: Pipette,
    contexts: [...paint, ...facePaint],
    shortcut: key('I', 'i'),
  },
  {
    id: 'paint.rotate',
    label: COPY.editor.model.paint.tools.rotateSkin,
    icon: RotateCw,
    contexts: [...paint, ...facePaint],
    shortcut: key('R', 'r'),
  },
  {
    id: 'paint.face-editor',
    label: COPY.editor.model.paint.tools.faceEditor,
    icon: ImageIcon,
    contexts: paint,
    shortcut: key('F', 'f'),
    help: COPY.editor.model.paint.faceEditor.hint,
  },
  {
    id: 'paint.mirror',
    label: COPY.editor.model.paint.mirror,
    icon: FlipHorizontal2,
    contexts: [...paint, ...facePaint],
    shortcut: key('M', 'm'),
  },
  {
    id: 'paint.apply',
    label: COPY.editor.model.paint.apply.button,
    icon: ImageIcon,
    contexts: paint,
  },
  {
    id: 'paint.brush-1',
    label: `${COPY.editor.model.paint.sizeLabel}: ${COPY.editor.model.paint.sizes[1]}`,
    icon: Circle,
    contexts: [...paint, ...facePaint],
    shortcut: key('1', '1'),
  },
  {
    id: 'paint.brush-2',
    label: `${COPY.editor.model.paint.sizeLabel}: ${COPY.editor.model.paint.sizes[2]}`,
    icon: Circle,
    contexts: [...paint, ...facePaint],
    shortcut: key('2', '2'),
  },
  {
    id: 'paint.brush-3',
    label: `${COPY.editor.model.paint.sizeLabel}: ${COPY.editor.model.paint.sizes[3]}`,
    icon: Circle,
    contexts: [...paint, ...facePaint],
    shortcut: key('3', '3'),
  },
  {
    id: 'mesh.mode.vertex',
    label: COPY.editor.model.mesh.modes.vertex,
    icon: Circle,
    contexts: allMesh,
    shortcut: key('1', '1'),
  },
  {
    id: 'mesh.mode.edge',
    label: COPY.editor.model.mesh.modes.edge,
    icon: Minus,
    contexts: allMesh,
    shortcut: key('2', '2'),
  },
  {
    id: 'mesh.mode.face',
    label: COPY.editor.model.mesh.modes.face,
    icon: Square,
    contexts: allMesh,
    shortcut: key('3', '3'),
  },
  {
    id: 'mesh.additive',
    label: COPY.editor.model.mesh.additive,
    icon: Plus,
    contexts: allMesh,
    shortcut: key('Shift', 'shift'),
  },
  {
    id: 'mesh.merge',
    label: COPY.editor.model.mesh.tools.merge,
    icon: Merge,
    contexts: ['mesh-vertex'],
  },
  {
    id: 'mesh.create-face',
    label: COPY.editor.model.mesh.tools.createFace,
    icon: SquarePlus,
    contexts: ['mesh-vertex'],
  },
  {
    id: 'mesh.connect',
    label: COPY.editor.model.mesh.tools.connect,
    icon: GitFork,
    contexts: ['mesh-vertex'],
  },
  {
    id: 'mesh.extrude-edges',
    label: COPY.editor.model.mesh.tools.extrude,
    icon: ArrowUpFromLine,
    contexts: ['mesh-edge'],
  },
  {
    id: 'mesh.loop-cut',
    label: COPY.editor.model.mesh.tools.loopCut,
    icon: Scissors,
    contexts: ['mesh-edge'],
  },
  {
    id: 'mesh.extrude-faces',
    label: COPY.editor.model.mesh.tools.extrude,
    icon: ArrowUpFromLine,
    contexts: ['mesh-face'],
  },
  {
    id: 'mesh.inset',
    label: COPY.editor.model.mesh.tools.inset,
    icon: Shrink,
    contexts: ['mesh-face'],
  },
  {
    id: 'mesh.flip',
    label: COPY.editor.model.mesh.tools.flip,
    icon: FlipVertical2,
    contexts: ['mesh-face'],
  },
  {
    id: 'mesh.split',
    label: COPY.editor.model.mesh.tools.split,
    icon: Triangle,
    contexts: ['mesh-face'],
  },
  {
    id: 'mesh.delete',
    label: COPY.editor.model.mesh.deleteSelection,
    icon: Trash2,
    contexts: allMesh,
    shortcut: key('Delete', 'delete', 'backspace'),
  },
  {
    id: 'mesh.done',
    label: COPY.editor.model.mesh.done,
    icon: Check,
    contexts: allMesh,
    shortcut: key('E / Esc', 'e', 'escape'),
  },
  { id: 'view.frame', label: COPY.editor.model.views.frame, icon: Focus, contexts: allMain },
  { id: 'view.grid', label: COPY.editor.model.grid, icon: Grid3x3, contexts: allMain },
  { id: 'view.edges', label: COPY.editor.model.edges, icon: Frame, contexts: allMain },
] as const satisfies readonly ModelCommandDefinition[]

export type ModelCommandId = (typeof COMMAND_DEFINITIONS)[number]['id']
export const MODEL_COMMANDS: readonly ModelCommandDefinition[] = COMMAND_DEFINITIONS

export function isModelCommandId(value: string): value is ModelCommandId {
  return COMMAND_DEFINITIONS.some((command) => command.id === value)
}

export const SHAPE_COMMAND = {
  box: 'add.box',
  wedge: 'add.wedge',
  cylinder: 'add.cylinder',
  sphere: 'add.sphere',
  mesh: 'add.mesh',
} as const satisfies Record<string, ModelCommandId>

export const TRANSFORM_COMMAND = {
  move: 'tool.move',
  rotate: 'tool.rotate',
  scale: 'tool.scale',
  snap: 'tool.snap',
} as const satisfies Record<TransformTool, ModelCommandId>

export const PAINT_COMMAND = {
  pencil: 'paint.pencil',
  eraser: 'paint.eraser',
  fillFace: 'paint.fill-face',
  fillPart: 'paint.fill-part',
  picker: 'paint.picker',
  rotateSkin: 'paint.rotate',
  faceEditor: 'paint.face-editor',
} as const satisfies Record<PaintTool, ModelCommandId>

export const MESH_MODE_COMMAND = {
  vertex: 'mesh.mode.vertex',
  edge: 'mesh.mode.edge',
  face: 'mesh.mode.face',
} as const satisfies Record<MeshSelectMode, ModelCommandId>

export const MESH_ACTION_COMMAND = {
  merge: 'mesh.merge',
  createFace: 'mesh.create-face',
  connect: 'mesh.connect',
  extrudeEdges: 'mesh.extrude-edges',
  loopCut: 'mesh.loop-cut',
  extrudeFaces: 'mesh.extrude-faces',
  inset: 'mesh.inset',
  flip: 'mesh.flip',
  split: 'mesh.split',
} as const satisfies Record<MeshCommandId, ModelCommandId>

export function modelCommand(id: ModelCommandId): ModelCommandDefinition {
  const command = MODEL_COMMANDS.find((item) => item.id === id)
  if (!command) throw new Error(`Comando desconhecido: ${id}`)
  return command
}

export interface ModelCommandState {
  enabled: boolean
  disabledReason?: string
  active?: boolean
  run: () => void
}

export interface ResolvedModelCommand extends ModelCommandDefinition, ModelCommandState {}

export function bindModelCommand(
  id: ModelCommandId,
  state: ModelCommandState,
): ResolvedModelCommand {
  return { ...modelCommand(id), ...state }
}

export function contextualModelCommands(
  context: ModelCommandContext,
  states: Partial<Record<ModelCommandId, ModelCommandState>> = {},
): ResolvedModelCommand[] {
  return MODEL_COMMANDS.filter((command) => command.contexts.includes(context)).map((command) => {
    const state = isModelCommandId(command.id) ? states[command.id] : undefined
    return {
      ...command,
      enabled: state?.enabled ?? true,
      ...(state?.disabledReason ? { disabledReason: state.disabledReason } : {}),
      ...(state?.active !== undefined ? { active: state.active } : {}),
      run: state?.run ?? (() => undefined),
    }
  })
}

export function commandForShortcut(
  context: ModelCommandContext,
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
): ModelCommandId | null {
  const pressed = event.key.toLowerCase()
  const primaryPressed = event.ctrlKey || event.metaKey
  const command = MODEL_COMMANDS.find((candidate) => {
    const shortcut = candidate.shortcut
    if (!shortcut || !candidate.contexts.includes(context) || !shortcut.keys.includes(pressed)) {
      return false
    }
    return shortcut.modifier === 'primary'
      ? primaryPressed && !event.altKey
      : !primaryPressed && !event.altKey
  })
  return command && isModelCommandId(command.id) ? command.id : null
}

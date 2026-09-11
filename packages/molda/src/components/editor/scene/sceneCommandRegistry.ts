/**
 * O que a oficina 3D sabe fazer, num array só.
 *
 * Espelha `editor/model/commandRegistry.ts`, que já provou o desenho no editor antigo: uma
 * definição alimenta o trilho, os atalhos e a tela de ajuda, e as três nunca divergem. A
 * oficina nova não tem nada disso — os atalhos são um `onKeyDown` escrito à mão, sem
 * checagem de colisão, e tela de ajuda não existe.
 *
 * Três campos que o registro do editor antigo não precisava e este precisa:
 *
 * - `slot`: qual ZONA desenha o comando. Um comando mora em exatamente uma.
 * - `tier`: a resposta da dona ao que mais incomoda, virada em dado. **1** é o que a criança
 *   usa toda hora e entende sozinha; **2** é o que ela usa às vezes, a um toque; **3** é raro
 *   ou abstrato, atrás de um diálogo.
 * - `group`: a `<legend>` visível do trilho. Cinco glifos sob "Criar" são cinco jeitos de
 *   criar; sem a legenda são cinco desenhos soltos.
 *
 * A FAMÍLIA de cada comando (o portão por nível de carreira) não é campo daqui: mora no mapa
 * irmão `sceneCommandAccess.ts`, e o `can` opcional das funções abaixo a aplica.
 *
 * ⚠️ Este arquivo nasce como CARACTERIZAÇÃO: `tier` descreve onde cada comando está HOJE, não
 * onde ele deveria estar. Assim o registro entra verde, com o teste provando que ele conta a
 * verdade sobre a tela atual, e a hierarquização vira uma mudança de coluna depois, revisável
 * linha a linha, em vez de um layout novo escondendo a decisão.
 *
 * ⚠️ O registro só lista o que a oficina TEM hoje. Três comandos que o desenho novo pede
 * ficaram DE FORA porque não existem ainda, e o teste os pegou quando eu tentei incluí-los:
 * a tela de ajuda (a oficina não tem nenhuma), o botão de entrar em Pintar (hoje só aparece
 * com uma sessão de pintura já aberta) e o botão único de câmera (hoje são seis botões de
 * vista soltos). Cada um entra junto com a implementação dele, não antes.
 */
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import {
  ArrowLeft,
  ArrowUpFromLine,
  Box,
  Check,
  Circle,
  Copy,
  Cylinder,
  Download,
  Eye,
  Focus,
  Grid3x3,
  Group,
  Hexagon,
  ImageIcon,
  Layers,
  type LucideIcon,
  MousePointer2,
  Move,
  RotateCw,
  Scaling,
  Scissors,
  Shrink,
  Sparkles,
  Spline,
  Square,
  SquarePlus,
  Trash2,
  Triangle,
  Undo2,
  Ungroup,
  Upload,
} from '../../ui/icons'
import { type SceneToolCheck, sceneCommandAllowed } from './sceneCommandAccess'

export type SceneCommandContext =
  | 'global'
  | 'model'
  | 'mesh-vertex'
  | 'mesh-edge'
  | 'mesh-face'
  | 'paint'
  | 'animate'

/** A zona que desenha o comando. */
export type SceneCommandSlot =
  | 'app'
  | 'menu'
  | 'rail'
  | 'rail-options'
  | 'stage'
  | 'dock'
  | 'dialog'

/** A `<legend>` do trilho. A ordem aqui é a ordem em que os grupos aparecem. */
export type SceneCommandGroup = 'create' | 'tools' | 'piece' | 'edit' | 'select' | 'mesh' | 'pinned'

export interface SceneCommandShortcut {
  display: string
  keys: readonly string[]
  modifier?: 'primary' | 'shift'
}

export interface SceneCommandDefinition {
  id: string
  /** O rótulo em pt-BR. Vira o `aria-label` quando o botão for só ícone. */
  label: string
  icon: LucideIcon
  contexts: readonly SceneCommandContext[]
  slot: SceneCommandSlot
  tier: 1 | 2 | 3
  group?: SceneCommandGroup
  shortcut?: SceneCommandShortcut
  /** Uma frase, mostrada na tela de ajuda e no fim da dica do botão. */
  help?: string
  /** Desenha `aria-pressed` em vez de uma ação simples. */
  toggle?: boolean
  /** Escondido em Animar, invariante já escrita no CLAUDE.md. */
  destructive?: boolean
}

const key = (display: string, ...keys: string[]): SceneCommandShortcut => ({ display, keys })
const primary = (display: string, ...keys: string[]): SceneCommandShortcut => ({
  display,
  keys,
  modifier: 'primary',
})

const scene = COPY.scene
const model = ['model'] as const
const allMesh = ['mesh-vertex', 'mesh-edge', 'mesh-face'] as const
const anyEdit = ['model', ...allMesh, 'paint'] as const

const COMMAND_DEFINITIONS = [
  // ── barra do app ────────────────────────────────────────────────────────────
  {
    id: 'app.exit',
    label: scene.exit.open,
    icon: ArrowLeft,
    contexts: ['global'],
    slot: 'app',
    tier: 1,
  },
  {
    id: 'app.undo',
    label: COPY.editor.undo,
    icon: Undo2,
    contexts: ['global'],
    slot: 'app',
    tier: 1,
    shortcut: primary('Ctrl+Z', 'z'),
  },
  {
    id: 'app.redo',
    label: COPY.editor.redo,
    icon: Undo2,
    contexts: ['global'],
    slot: 'app',
    tier: 1,
    shortcut: { display: 'Ctrl+Shift+Z', keys: ['z'], modifier: 'shift' },
  },
  {
    id: 'app.export',
    label: scene.glbExport.open,
    icon: Download,
    contexts: ['global'],
    slot: 'app',
    tier: 1,
  },
  { id: 'app.save', label: scene.save, icon: Check, contexts: ['global'], slot: 'menu', tier: 3 },
  {
    id: 'app.backup',
    label: scene.backup,
    icon: Upload,
    contexts: ['global'],
    slot: 'menu',
    tier: 3,
  },
  {
    id: 'app.import',
    label: NATIVE_IMPORT_COPY.open,
    icon: Upload,
    contexts: ['global'],
    slot: 'menu',
    tier: 3,
  },

  // ── trilho · Criar ──────────────────────────────────────────────────────────
  {
    id: 'add.menu',
    label: scene.add,
    icon: SquarePlus,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'create',
  },
  {
    id: 'add.box',
    label: COPY.shapes.box,
    icon: Box,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'create',
  },
  {
    id: 'add.wedge',
    label: COPY.shapes.wedge,
    icon: Triangle,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'create',
  },
  {
    id: 'add.cylinder',
    label: COPY.shapes.cylinder,
    icon: Cylinder,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'create',
  },
  {
    id: 'add.sphere',
    label: COPY.shapes.sphere,
    icon: Circle,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'create',
  },
  {
    id: 'add.locator',
    label: scene.addLocator,
    icon: Focus,
    contexts: model,
    slot: 'rail',
    tier: 2,
    group: 'create',
  },

  // ── trilho · Ferramentas ────────────────────────────────────────────────────
  {
    id: 'tool.select',
    label: scene.selectTool,
    icon: MousePointer2,
    contexts: [...model, ...allMesh],
    slot: 'rail',
    tier: 1,
    group: 'tools',
    toggle: true,
  },
  {
    id: 'tool.box',
    label: scene.selectBox,
    icon: Square,
    contexts: model,
    slot: 'rail',
    tier: 2,
    group: 'tools',
    toggle: true,
  },
  {
    id: 'tool.lasso',
    label: scene.selectLasso,
    icon: Spline,
    contexts: model,
    slot: 'rail',
    tier: 2,
    group: 'tools',
    toggle: true,
  },
  {
    id: 'tool.move',
    label: scene.move,
    icon: Move,
    contexts: [...model, ...allMesh, 'animate'],
    slot: 'rail',
    tier: 1,
    group: 'tools',
    toggle: true,
  },
  {
    id: 'tool.rotate',
    label: scene.rotate,
    icon: RotateCw,
    contexts: [...model, ...allMesh, 'animate'],
    slot: 'rail',
    tier: 1,
    group: 'tools',
    toggle: true,
  },
  {
    id: 'tool.scale',
    label: scene.scale,
    icon: Scaling,
    contexts: [...model, ...allMesh, 'animate'],
    slot: 'rail',
    tier: 1,
    group: 'tools',
    toggle: true,
  },

  // ── trilho · Esta peça ──────────────────────────────────────────────────────
  {
    id: 'node.duplicate',
    label: scene.duplicate,
    icon: Copy,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'piece',
    shortcut: primary('Ctrl+D', 'd'),
  },
  {
    id: 'node.remove',
    label: scene.remove,
    icon: Trash2,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'piece',
    destructive: true,
    shortcut: key('Delete', 'delete'),
  },
  {
    id: 'node.group',
    label: scene.group,
    icon: Group,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'piece',
  },
  {
    id: 'node.ungroup',
    label: scene.ungroup,
    icon: Ungroup,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'piece',
    destructive: true,
  },
  {
    id: 'node.convert-mesh',
    label: scene.convertMesh,
    icon: Hexagon,
    contexts: model,
    slot: 'dock',
    tier: 2,
  },

  // ── trilho · Editar ─────────────────────────────────────────────────────────
  {
    id: 'mode.mesh',
    label: scene.editFaces,
    icon: Hexagon,
    contexts: model,
    slot: 'rail',
    tier: 1,
    group: 'edit',
    toggle: true,
  },

  // ── trilho · fixos no rodapé ────────────────────────────────────────────────
  {
    id: 'select.additive',
    label: scene.addSelection,
    icon: Layers,
    contexts: anyEdit,
    slot: 'rail',
    tier: 1,
    group: 'pinned',
    toggle: true,
  },
  {
    id: 'view.isolate',
    label: COPY.editor.model.isolation.toggle,
    icon: Eye,
    contexts: anyEdit,
    slot: 'rail',
    tier: 1,
    group: 'pinned',
    toggle: true,
  },

  // ── palco ───────────────────────────────────────────────────────────────────
  {
    id: 'view.frame',
    label: COPY.editor.model.views.selection,
    icon: Focus,
    contexts: anyEdit,
    slot: 'stage',
    tier: 1,
  },
  {
    id: 'view.grid',
    label: scene.showGrid,
    icon: Grid3x3,
    contexts: anyEdit,
    slot: 'stage',
    tier: 1,
    toggle: true,
  },
  {
    id: 'view.supports',
    label: scene.supportGuides,
    icon: Sparkles,
    contexts: model,
    slot: 'dock',
    tier: 2,
    toggle: true,
  },
  {
    id: 'view.reference',
    label: COPY.editor.model.reference.title,
    icon: ImageIcon,
    contexts: anyEdit,
    slot: 'stage',
    tier: 2,
  },

  // ── malha, por contexto ─────────────────────────────────────────────────────
  {
    id: 'mesh.extrude',
    label: scene.facePreview.extrude,
    icon: ArrowUpFromLine,
    contexts: ['mesh-face'],
    slot: 'rail',
    tier: 1,
    group: 'mesh',
  },
  {
    id: 'mesh.inset',
    label: scene.facePreview.inset,
    icon: Shrink,
    contexts: ['mesh-face'],
    slot: 'rail',
    tier: 1,
    group: 'mesh',
  },
  {
    id: 'mesh.plane-cut',
    label: scene.planeCut,
    icon: Scissors,
    contexts: allMesh,
    slot: 'dialog',
    tier: 3,
  },
  {
    id: 'mesh.uv',
    label: scene.uvTitle,
    icon: ImageIcon,
    contexts: ['mesh-face'],
    slot: 'dialog',
    tier: 3,
  },
] as const satisfies readonly SceneCommandDefinition[]

export const SCENE_COMMANDS: readonly SceneCommandDefinition[] = COMMAND_DEFINITIONS
export type SceneCommandId = (typeof COMMAND_DEFINITIONS)[number]['id']

export function isSceneCommandId(value: string): value is SceneCommandId {
  return COMMAND_DEFINITIONS.some((command) => command.id === value)
}

export function sceneCommand(id: SceneCommandId): SceneCommandDefinition {
  const command = SCENE_COMMANDS.find((item) => item.id === id)
  if (!command) throw new Error(`Comando desconhecido: ${id}`)
  return command
}

export interface SceneCommandState {
  enabled: boolean
  disabledReason?: string
  active?: boolean
  run: () => void
}

export interface ResolvedSceneCommand extends SceneCommandDefinition, SceneCommandState {}

export function bindSceneCommand(
  id: SceneCommandId,
  state: SceneCommandState,
): ResolvedSceneCommand {
  return { ...sceneCommand(id), ...state }
}

/**
 * Os comandos de uma zona no contexto atual.
 *
 * ⚠️ Em Animar os destrutivos de modelagem somem, inclusive o Apagar. A invariante já estava
 * escrita no `CLAUDE.md`; aqui ela é o próprio filtro, então não dá para esquecer dela ao
 * montar uma zona nova.
 * ⚠️ Com `can` (o do `useMoldaToolAccess()`), comando de família trancada também some: não
 * vira botão desligado. Sem `can`, tudo liberado.
 */
export function contextualSceneCommands(
  context: SceneCommandContext,
  slot: SceneCommandSlot,
  states: Partial<Record<SceneCommandId, SceneCommandState>> = {},
  can?: SceneToolCheck,
): ResolvedSceneCommand[] {
  return SCENE_COMMANDS.filter(
    (command) =>
      command.slot === slot &&
      command.contexts.includes(context) &&
      !(context === 'animate' && command.destructive) &&
      isSceneCommandId(command.id) &&
      sceneCommandAllowed(command.id, can),
  ).map((command) => {
    const state = isSceneCommandId(command.id) ? states[command.id] : undefined
    return {
      ...command,
      enabled: state?.enabled ?? true,
      ...(state?.disabledReason ? { disabledReason: state.disabledReason } : {}),
      ...(state?.active !== undefined ? { active: state.active } : {}),
      run: state?.run ?? (() => undefined),
    }
  })
}

/** O trilho, já separado nos grupos que viram `<legend>`, na ordem declarada. */
export const SCENE_GROUP_ORDER: readonly SceneCommandGroup[] = [
  'create',
  'tools',
  'piece',
  'edit',
  'select',
  'mesh',
  'pinned',
]

export function sceneRailGroups(
  context: SceneCommandContext,
  states: Partial<Record<SceneCommandId, SceneCommandState>> = {},
  can?: SceneToolCheck,
): Array<{ group: SceneCommandGroup; commands: ResolvedSceneCommand[] }> {
  const rail = contextualSceneCommands(context, 'rail', states, can)
  return SCENE_GROUP_ORDER.map((group) => ({
    group,
    commands: rail.filter((command) => command.group === group),
  })).filter((entry) => entry.commands.length > 0)
}

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>

export interface SceneShortcutMatch {
  id: SceneCommandId
  /** `false` = o atalho é da oficina, mas a família está trancada. */
  allowed: boolean
}

/**
 * O comando do atalho, e se a criança pode usá-lo. ⚠️ Atalho de família trancada continua sendo
 * da oficina: quem chama dá `preventDefault` e não age, senão o Ctrl+D do navegador dispara.
 */
export function matchSceneShortcut(
  context: SceneCommandContext,
  event: ShortcutEvent,
  can?: SceneToolCheck,
): SceneShortcutMatch | null {
  const pressed = event.key.toLowerCase()
  const primaryPressed = event.ctrlKey || event.metaKey
  const command = SCENE_COMMANDS.find((candidate) => {
    const shortcut = candidate.shortcut
    if (!shortcut || !candidate.contexts.includes(context) || !shortcut.keys.includes(pressed))
      return false
    if (event.altKey) return false
    if (shortcut.modifier === 'shift') return primaryPressed && event.shiftKey
    if (shortcut.modifier === 'primary') return primaryPressed && !event.shiftKey
    return !primaryPressed
  })
  if (!command || !isSceneCommandId(command.id)) return null
  return { id: command.id, allowed: sceneCommandAllowed(command.id, can) }
}

/** O comando que o atalho executa; trancado ou sem comando = `null`. */
export function sceneCommandForShortcut(
  context: SceneCommandContext,
  event: ShortcutEvent,
  can?: SceneToolCheck,
): SceneCommandId | null {
  const match = matchSceneShortcut(context, event, can)
  return match?.allowed ? match.id : null
}

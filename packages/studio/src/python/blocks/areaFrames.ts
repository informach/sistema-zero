/**
 * Os blocos de área do Python no Blockly (no lugar do antigo "Programa").
 *
 * Cada área é um contêiner sem código próprio: o que ela mostra são as linhas de topo daquele
 * trecho do arquivo, na ordem do arquivo. A ordem entre as áreas é sempre a de `PYTHON_AREAS`,
 * nunca a posição na tela. No máximo uma área de cada tipo; um bloco fora das áreas é rascunho.
 */
import * as Blockly from 'blockly/core'
import {
  PROJECT_AREA_SAFE_DELETE_EXTENSION,
  registerProjectAreaSafeDeleteExtension,
} from '../../blockly/projectAreaSafeDelete'
import {
  PYTHON_AREA_BY_FRAME,
  PYTHON_AREA_BY_KIND,
  PYTHON_AREA_FRAME_TYPES,
  PYTHON_AREA_LAYOUT_ROWS,
  PYTHON_AREAS,
  type PythonAreaKind,
} from './areas'

/** Entrada de enunciado das áreas: o mesmo nome do JavaScript (reaproveita a exclusão segura). */
export const PYTHON_AREA_INPUT = 'CHILDREN'

export function registerPythonAreaFrames() {
  registerProjectAreaSafeDeleteExtension()
  for (const area of PYTHON_AREAS) {
    if (Blockly.Blocks[area.frameType]) continue
    Blockly.defineBlocksWithJsonArray([
      {
        type: area.frameType,
        message0: area.hint ? `${area.title} %1` : area.title,
        args0: area.hint ? [{ type: 'field_label', text: area.hint, class: 'sz-area-hint' }] : [],
        message1: '%1',
        args1: [{ type: 'input_statement', name: PYTHON_AREA_INPUT, check: 'Python:statement' }],
        colour: area.colour,
        tooltip: area.tooltip,
        extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
      },
    ])
  }
}

export const isPythonAreaFrame = (block: Blockly.Block | null | undefined) =>
  !!block && PYTHON_AREA_FRAME_TYPES.has(block.type)

export function pythonAreaKindOf(
  block: Blockly.Block | null | undefined,
): PythonAreaKind | undefined {
  return block ? PYTHON_AREA_BY_FRAME.get(block.type)?.kind : undefined
}

/**
 * Raízes do modo antigo, sem áreas (testes e scripts que montam o workspace sem elas): todas
 * existem e nenhuma é área. A raiz que SUMIU (a área excluída) não volta a esse modo.
 */
export function isLegacyPythonRoots(workspace: Blockly.Workspace, roots: readonly string[]) {
  if (!roots.length || workspace.getTopBlocks(false).some(isPythonAreaFrame)) return false
  return roots.every((id) => {
    const block = workspace.getBlockById(id)
    return !!block && !isPythonAreaFrame(block)
  })
}

/** As áreas do workspace, por tipo. Lança se houver área repetida ou dentro de outro bloco. */
export function pythonAreaFrames(workspace: Blockly.Workspace): Map<PythonAreaKind, Blockly.Block> {
  const frames = new Map<PythonAreaKind, Blockly.Block>()
  for (const type of PYTHON_AREA_FRAME_TYPES) {
    const found = workspace.getBlocksByType(type, false)
    if (found.length > 1 || found[0]?.getParent())
      throw new Error('Cada área do projeto Python aparece uma vez só.')
    if (found[0]) frames.set(PYTHON_AREA_BY_FRAME.get(type)!.kind, found[0])
  }
  return frames
}

/** As áreas na ordem do arquivo. */
export function orderedPythonAreaFrames(workspace: Blockly.Workspace): Blockly.Block[] {
  const frames = pythonAreaFrames(workspace)
  return PYTHON_AREAS.flatMap((area) => {
    const frame = frames.get(area.kind)
    return frame ? [frame] : []
  })
}

/** As áreas que têm linhas do programa (as vazias não mudam o código). */
export function executablePythonAreaFrames(workspace: Blockly.Workspace): Blockly.Block[] {
  return orderedPythonAreaFrames(workspace).filter(
    (frame) => !!frame.getInputTargetBlock(PYTHON_AREA_INPUT),
  )
}

export function pythonScratchRoots(workspace: Blockly.Workspace) {
  return workspace.getTopBlocks(false).filter((block) => !isPythonAreaFrame(block))
}

/** Cria a área se ela ainda não existe (com SVG quando o workspace desenha). */
export function ensurePythonAreaFrame(workspace: Blockly.Workspace, kind: PythonAreaKind) {
  const existing = pythonAreaFrames(workspace).get(kind)
  if (existing) return existing
  registerPythonAreaFrames()
  const frame = workspace.newBlock(PYTHON_AREA_BY_KIND.get(kind)!.frameType)
  if (frame instanceof Blockly.BlockSvg) {
    frame.initSvg()
    frame.render()
  }
  return frame
}

/** Encaixa uma pilha no fim da área (antes de nada: a área vira a dona da pilha). */
export function appendToPythonAreaFrame(frame: Blockly.Block, first: Blockly.Block) {
  let tail = frame.getInputTargetBlock(PYTHON_AREA_INPUT)
  while (tail?.getNextBlock()) tail = tail.getNextBlock()
  const connection = tail ? tail.nextConnection : frame.getInput(PYTHON_AREA_INPUT)?.connection
  if (!connection || !first.previousConnection)
    throw new Error('Este bloco não encaixa numa área do projeto.')
  connection.connect(first.previousConnection)
}

const GAP = 48
const MARGIN = 24

/**
 * A arrumação do "Organizar blocos": as duas fileiras do JavaScript ([📦, 🎛️] e
 * [🧩, ⚙️, ⚡, 🔁]). Só desenha quando o workspace tem tamanho de bloco (BlockSvg).
 */
export function layoutPythonAreaFrames(workspace: Blockly.Workspace) {
  const frames = pythonAreaFrames(workspace)
  let y = MARGIN
  let widest = 0
  for (const row of PYTHON_AREA_LAYOUT_ROWS) {
    let x = MARGIN
    let tallest = 0
    for (const kind of row) {
      const frame = frames.get(kind)
      if (!(frame instanceof Blockly.BlockSvg)) continue
      frame.moveTo(new Blockly.utils.Coordinate(x, y))
      const size = frame.getHeightWidth()
      x += size.width + GAP
      tallest = Math.max(tallest, size.height)
    }
    widest = Math.max(widest, x)
    if (tallest) y += tallest + GAP
  }
  // Rascunhos ficam à direita das áreas, sem cobrir nenhuma.
  let scratchY = MARGIN
  for (const root of pythonScratchRoots(workspace)) {
    if (!(root instanceof Blockly.BlockSvg)) continue
    root.moveTo(new Blockly.utils.Coordinate(widest + GAP, scratchY))
    scratchY += root.getHeightWidth().height + GAP / 2
  }
}

/** Posições das áreas por tipo (para manter a arrumação da criança depois de recarregar). */
export function pythonAreaPositions(workspace: Blockly.Workspace) {
  const positions = new Map<PythonAreaKind, { x: number; y: number }>()
  for (const [kind, frame] of pythonAreaFrames(workspace)) {
    const at = frame.getRelativeToSurfaceXY()
    positions.set(kind, { x: at.x, y: at.y })
  }
  return positions
}

/**
 * Área que cresceu (uma função aberta, um bloco a mais) e passou por cima de outra: a de depois,
 * na ordem das fileiras, vai para a direita (mesma fileira) ou para baixo. Fora do desfazer (é
 * arrumação da tela, não gesto da criança). Devolve se mexeu.
 */
export function pushOverlappingPythonAreas(workspace: Blockly.Workspace): boolean {
  let frames: Map<PythonAreaKind, Blockly.Block>
  try {
    frames = pythonAreaFrames(workspace)
  } catch {
    return false
  }
  const ordered = PYTHON_AREA_LAYOUT_ROWS.flat()
    .map((kind) => frames.get(kind))
    .filter((frame): frame is Blockly.BlockSvg => frame instanceof Blockly.BlockSvg)
  if (ordered.length < 2) return false
  const undo = Blockly.Events.getRecordUndo()
  Blockly.Events.setRecordUndo(false)
  let moved = false
  try {
    for (let pass = 0; pass < ordered.length; pass++) {
      let changed = false
      for (let later = 1; later < ordered.length; later++)
        for (let earlier = 0; earlier < later; earlier++) {
          const a = ordered[earlier]!.getBoundingRectangle()
          const b = ordered[later]!.getBoundingRectangle()
          if (a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
            continue
          if (Math.abs(a.top - b.top) < GAP) ordered[later]!.moveBy(a.right + GAP - b.left, 0)
          else ordered[later]!.moveBy(0, a.bottom + GAP - b.top)
          changed = moved = true
        }
      if (!changed) break
    }
  } finally {
    Blockly.Events.setRecordUndo(undo)
  }
  return moved
}

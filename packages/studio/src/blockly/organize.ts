import * as Blockly from 'blockly/core'
import { PROJECT_AREA_LAYOUT_ROWS, PROJECT_AREAS } from '../core/behaviorAreas'
import { areaForBlockType, type ProjectAreaKind } from './blockContracts'

/** Espaço inicial e folgas (em px de workspace) do layout em colunas. */
const START_X = 32
const START_Y = 32
const GAP_X = 48
const GAP_Y = 24
const ROW_GAP = 64

/** Classifica um bloco top-level pela categoria a partir do seu tipo. */
function categoryOf(type: string): ProjectAreaKind {
  const registered = areaForBlockType(type)
  if (registered) return registered
  if (type.startsWith('sz_html_') || type === 'sz_adv_raw_html') return 'structure'
  if (type.startsWith('sz_css_') || type === 'sz_adv_raw_css') return 'appearance'
  return 'start'
}

/**
 * Organiza os blocos top-level em colunas (HTML | CSS | JS) que não se
 * sobrepõem, medindo a largura real de cada pilha após a renderização —
 * inspirado no "Format Code" do MakeCode Arcade.
 *
 * Diferente de `workspace.cleanUp()` (que empilha tudo numa única coluna), aqui
 * cada categoria fica lado a lado e a próxima coluna só começa depois da borda
 * direita da anterior, então uma pilha de HTML larga nunca cobre o CSS.
 *
 * É uma função pura sobre o workspace (move blocos); a persistência do estado
 * fica a cargo de quem chama (os eventos de `moveBy` fluem pelo listener do
 * BlocklyPanel e regravam o `blocksState`).
 */
export function organizeBlocks(workspace: Blockly.Workspace | null | undefined): void {
  if (!workspace) return
  const tops = workspace.getTopBlocks(true) as Blockly.BlockSvg[]
  if (tops.length === 0) return
  // Em workspace headless (testes) os blocos não têm geometria — nada a fazer.
  if (typeof tops[0]?.getBoundingRectangle !== 'function') return

  const groups = new Map<ProjectAreaKind, Blockly.BlockSvg[]>(
    PROJECT_AREAS.map((area) => [area, []]),
  )
  for (const top of tops) {
    const group = groups.get(categoryOf(top.type))
    if (!group) throw new Error(`Área de projeto sem grupo de organização: ${top.type}`)
    group.push(top)
  }

  const ws = workspace as Blockly.WorkspaceSvg
  Blockly.Events.setGroup(true)
  // Só registra se a API de pausar redimensionamentos existe (não captura o
  // estado anterior — sempre reativamos no fim, que é o comportamento padrão).
  const canToggleResizes = ws.setResizesEnabled != null
  try {
    if (canToggleResizes) ws.setResizesEnabled(false)
    let rowY = START_Y
    for (const row of PROJECT_AREA_LAYOUT_ROWS) {
      let runningX = START_X
      let rowHeight = 0
      for (const category of row) {
        const group = groups.get(category)
        if (!group) throw new Error(`Área de projeto sem grupo de organização: ${category}`)
        if (group.length === 0) continue
        group.sort(
          (a, b) => Number(b.type.startsWith('sz_frame_')) - Number(a.type.startsWith('sz_frame_')),
        )
        let y = rowY
        let colWidth = 0
        for (const top of group) {
          const rect = top.getBoundingRectangle()
          const width = rect.right - rect.left
          const height = rect.bottom - rect.top
          const current = top.getRelativeToSurfaceXY()
          top.moveBy(runningX - current.x, y - current.y)
          colWidth = Math.max(colWidth, width)
          y += height + GAP_Y
        }
        rowHeight = Math.max(rowHeight, y - rowY - GAP_Y)
        runningX += colWidth + GAP_X
      }
      if (rowHeight > 0) rowY += rowHeight + ROW_GAP
    }
  } finally {
    if (canToggleResizes) ws.setResizesEnabled(true)
    Blockly.Events.setGroup(false)
  }
  ws.render?.()
}

/**
 * Verdadeiro se duas pilhas top-level se sobrepõem visualmente. Usado para
 * auto-organizar apenas quando necessário (ex.: logo após uma conversão
 * código→blocos), preservando arranjos manuais do aluno que não se sobreponham.
 */
export function topBlocksOverlap(workspace: Blockly.Workspace | null | undefined): boolean {
  if (!workspace) return false
  const tops = workspace.getTopBlocks(false) as Blockly.BlockSvg[]
  if (tops.length < 2) return false
  if (typeof tops[0]?.getBoundingRectangle !== 'function') return false
  const rects = tops.map((b) => b.getBoundingRectangle())
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]
      const b = rects[j]
      if (!a || !b) continue
      const disjoint =
        a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
      if (!disjoint) return true
    }
  }
  return false
}

/** Organiza somente se houver sobreposição entre as pilhas top-level. */
export function organizeBlocksIfOverlapping(workspace: Blockly.Workspace | null | undefined): void {
  if (topBlocksOverlap(workspace)) organizeBlocks(workspace)
}

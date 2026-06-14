import * as Blockly from 'blockly/core'

/** Espaço inicial e folgas (em px de workspace) do layout em colunas. */
const START_X = 32
const START_Y = 32
const GAP_X = 48
const GAP_Y = 24

type Category = 'html' | 'css' | 'js'

/** Ordem das colunas, da esquerda para a direita. */
const COLUMN_ORDER: readonly Category[] = ['html', 'css', 'js']

/** Classifica um bloco top-level pela categoria a partir do seu tipo. */
function categoryOf(type: string): Category {
  if (type.startsWith('sz_html_') || type === 'sz_adv_raw_html') return 'html'
  if (type.startsWith('sz_css_') || type === 'sz_adv_raw_css') return 'css'
  // JS, Canvas, extensões e o "código avançado JS" caem na coluna de JS.
  return 'js'
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

  const groups: Record<Category, Blockly.BlockSvg[]> = { html: [], css: [], js: [] }
  for (const top of tops) {
    groups[categoryOf(top.type)].push(top)
  }

  const ws = workspace as Blockly.WorkspaceSvg
  Blockly.Events.setGroup(true)
  // Só registra se a API de pausar redimensionamentos existe (não captura o
  // estado anterior — sempre reativamos no fim, que é o comportamento padrão).
  const canToggleResizes = ws.setResizesEnabled != null
  try {
    if (canToggleResizes) ws.setResizesEnabled(false)
    let runningX = START_X
    for (const category of COLUMN_ORDER) {
      const group = groups[category]
      if (group.length === 0) continue
      let y = START_Y
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
      runningX += colWidth + GAP_X
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

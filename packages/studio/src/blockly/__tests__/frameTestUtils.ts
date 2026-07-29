import type * as Blockly from 'blockly/core'
import type { SZIRV2 } from '#ir'
import { buildIRFromWorkspace } from '../buildIR'

const FRAME_FOR = {
  js: 'sz_frame_start',
  events: 'sz_frame_events',
  loops: 'sz_frame_loops',
  html: 'sz_frame_structure',
  css: 'sz_frame_appearance',
} as const

/**
 * O modelo CONTAINER faz `buildIRFromWorkspace` ler SÓ o que está dentro de um
 * frame (🧱 HTML / 🎨 CSS / ⚙️ Ao iniciar / ⚡ Eventos / 🔁 Loops). Vários testes de unidade
 * montam blocos SOLTOS no topo à mão — este helper embrulha os blocos top-level no
 * frame da categoria certa ANTES de coletar a IR. Idempotente (se já há frame, ou
 * não há bloco solto, não faz nada). Marcadores de inserção são ignorados.
 */
export function wrapTopBlocksInFrame(
  ws: Blockly.Workspace,
  kind: keyof typeof FRAME_FOR = 'js',
): void {
  const tops = ws.getTopBlocks(true).filter((b) => !b.isInsertionMarker())
  if (tops.length === 0 || tops.some((b) => b.type.startsWith('sz_frame_'))) return
  const frame = ws.newBlock(FRAME_FOR[kind])
  let tail: Blockly.Connection | null = frame.getInput('CHILDREN')?.connection ?? null
  for (const top of tops) {
    if (tail && top.previousConnection) tail.connect(top.previousConnection)
    // Avança o tail até o fim da cadeia recém-conectada (cobre pilhas com .next).
    let last = top
    for (let n = last.getNextBlock(); n; n = last.getNextBlock()) last = n
    tail = last.nextConnection ?? null
  }
}

/** `buildIRFromWorkspace` depois de embrulhar os blocos soltos no frame da categoria. */
export function irInFrame(ws: Blockly.Workspace, kind: keyof typeof FRAME_FOR = 'js'): SZIRV2 {
  wrapTopBlocksInFrame(ws, kind)
  return buildIRFromWorkspace(ws)
}

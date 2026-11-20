import type * as Blockly from 'blockly/core'
import { BLOCKS_FROM_TOP_PADDING } from './offscreenThreshold'

/**
 * A lixeira e o zoom do Estúdio (mais altos, a lixeira por cima dos blocos, o desenho em vetor):
 * `workspaceControls.ts`, baixado à parte logo depois da injeção. Aqui, no pacote de abertura do
 * modo Blocos (que está no teto), fica só o pedido. Até o módulo chegar, os dois ficam escondidos
 * (`data-sz-controls="pending"` em `studio.css`, marcado na mesma tarefa da injeção, antes de
 * qualquer pintura), para não pularem de lugar; se não chegar, os controles nativos aparecem
 * onde o Blockly os põe. Só os editores do Estúdio marcam: outro editor de blocos dentro do tema
 * (o do Arquipélago) não é afetado.
 */
export function installCornerSpacer(workspace: Blockly.WorkspaceSvg): void {
  const injection = workspace.getInjectionDiv()
  injection.setAttribute('data-sz-controls', 'pending')
  void import('./workspaceControls').then(
    (controls) => controls.installWorkspaceControls(workspace),
    () => injection.setAttribute('data-sz-controls', 'ready'),
  )
}

/**
 * D8 da proposta: ao ABRIR o projeto, os blocos começam no canto de cima (com um respiro), não
 * no meio da tela com metade do canvas vazio em cima. Só na primeira carga de cada editor: a
 * Ponte recarrega os blocos a cada mudança no código, e a tela não pode pular.
 */
export function showBlocksFromTop(
  workspace: Blockly.WorkspaceSvg,
  padding = BLOCKS_FROM_TOP_PADDING,
): void {
  try {
    if (workspace.getTopBlocks(false).length === 0) return
    const metrics = workspace.getMetrics()
    workspace.scroll(-metrics.contentLeft + padding, -metrics.contentTop + padding)
  } catch {
    // Editor descartado entre o agendamento e o scroll.
  }
}

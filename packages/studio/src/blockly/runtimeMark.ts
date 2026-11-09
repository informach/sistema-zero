import * as Blockly from 'blockly/core'

/**
 * O sinal vermelho no bloco onde o jogo parou (redesenho do clássico, 11/2026): o aviso do
 * Blockly (`setWarningText`) com um id próprio, para não apagar o rascunho nem os avisos de
 * semântica presos ao mesmo bloco, e a classe `sz-runtime-error` no SVG, que pinta o ícone de
 * vermelho (o rascunho continua amarelo). Só a API pública do Blockly 12.
 */
export const RUNTIME_WARNING_ID = 'sz-runtime-error'
export const RUNTIME_ERROR_CLASS = 'sz-runtime-error'

const markedBlock = new WeakMap<Blockly.Workspace, string>()

function liveBlock(workspace: Blockly.Workspace, id: string): Blockly.BlockSvg | null {
  const block = workspace.getBlockById(id) as Blockly.BlockSvg | null
  return block && !block.isDeadOrDying() ? block : null
}

/** Põe o sinal no bloco (ou tira, com `null`); o sinal anterior sai. */
export function setRuntimeErrorBlock(
  workspace: Blockly.WorkspaceSvg,
  blockId: string | null,
  message: string,
): void {
  const previous = markedBlock.get(workspace)
  if (previous && previous !== blockId) {
    const old = liveBlock(workspace, previous)
    if (old) {
      old.setWarningText(null, RUNTIME_WARNING_ID)
      old.removeClass(RUNTIME_ERROR_CLASS)
    }
    markedBlock.delete(workspace)
  }
  if (!blockId) return
  const block = liveBlock(workspace, blockId)
  if (!block) return
  block.setWarningText(message, RUNTIME_WARNING_ID)
  block.addClass(RUNTIME_ERROR_CLASS)
  markedBlock.set(workspace, blockId)
}

/** O bloco que está com o sinal agora (para o "Mostrar o bloco"). */
export function runtimeErrorBlockId(workspace: Blockly.Workspace): string | null {
  return markedBlock.get(workspace) ?? null
}

/**
 * "Mostrar o bloco": abre os blocos fechados em volta, rola até ele, seleciona e, com
 * `openBubble`, abre o balão do aviso (o balão só aceita texto; os botões ficam no cartão).
 */
export function revealBlockInWorkspace(
  workspace: Blockly.WorkspaceSvg,
  blockId: string,
  openBubble: boolean,
): boolean {
  const block = liveBlock(workspace, blockId)
  if (!block) return false
  for (let parent = block.getParent(); parent; parent = parent.getParent()) {
    if (parent.isCollapsed()) parent.setCollapsed(false)
  }
  // `blockOnly`: centraliza no PRÓPRIO bloco, não na pilha que vem embaixo dele.
  workspace.centerOnBlock(block.id, true)
  block.select()
  if (openBubble) {
    void block.getIcon(Blockly.icons.IconType.WARNING)?.setBubbleVisible(true)
  }
  return true
}

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

/**
 * O bloco que está com o sinal agora (para o "Mostrar o bloco"). Um bloco que já saiu do espaço
 * (os blocos foram refeitos depois de uma edição) não conta: quem pede marca de novo pela linha.
 */
export function runtimeErrorBlockId(workspace: Blockly.Workspace): string | null {
  const id = markedBlock.get(workspace)
  if (!id) return null
  const block = liveBlock(workspace, id)
  return block?.getSvgRoot?.()?.classList.contains(RUNTIME_ERROR_CLASS) ? id : null
}

/**
 * Abre os blocos fechados que ENVOLVEM `block` (o "Se" ou a função em que ele está, e os de fora
 * deles), e só eles. Pelo `getSurroundParent`, não pelo `getParent`: numa pilha, o pai de um bloco
 * é o bloco de CIMA, e subir por ele abria toda função recolhida acima do alvo na mesma área. No
 * Reino Zero Ultra, "Mostrar o bloco" abria 78 funções e mudava o projeto salvo, que subia de novo
 * para a conta (achado na conferência do staging, 21/11/2026).
 */
export function expandAroundBlock(block: Blockly.Block): void {
  for (let parent = block.getSurroundParent(); parent; parent = parent.getSurroundParent())
    if (parent.isCollapsed()) parent.setCollapsed(false)
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
  expandAroundBlock(block)
  // `blockOnly`: centraliza no PRÓPRIO bloco, não na pilha que vem embaixo dele.
  workspace.centerOnBlock(block.id, true)
  block.select()
  if (openBubble) {
    void block.getIcon(Blockly.icons.IconType.WARNING)?.setBubbleVisible(true)
  }
  return true
}

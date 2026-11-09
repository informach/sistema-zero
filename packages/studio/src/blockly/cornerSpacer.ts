import * as Blockly from 'blockly/core'

/**
 * Sobe a lixeira e o zoom do Blockly (pedido dela, 08/11/2026: "está muito para baixo e a
 * lixeira está muito escondida"). O Blockly empilha os controles a partir do canto oposto à
 * paleta, cada um desviando dos retângulos já ocupados (`savedPositions`). Este componente
 * invisível ocupa a faixa de baixo desse canto ANTES da lixeira (peso entre o da paleta solta,
 * 1, e o da lixeira, 2): lixeira e zoom desviam dele e sobem juntos, e continuam sendo os
 * controles nativos (arrastar para a lixeira, abrir a lixeira, zoom). Só API pública
 * (`IPositionable` + `ComponentManager`).
 */
const SPACER_WEIGHT = 1.5
/** Quanto a pilha sobe: livra a barra de rolagem de baixo e a borda da janela. */
export const CORNER_SPACER_HEIGHT_PX = 56
const SPACER_WIDTH_PX = 48
const MARGIN_PX = 20

class CornerSpacer implements Blockly.IPositionable {
  readonly id = 'szCornerSpacer'
  private rect: Blockly.utils.Rect | null = null

  constructor(
    private readonly workspace: Blockly.WorkspaceSvg,
    private readonly height: number,
  ) {}

  position(metrics: Blockly.MetricsManager.UiMetrics, savedPositions: Blockly.utils.Rect[]): void {
    const corner = Blockly.uiPosition.getCornerOppositeToolbox(this.workspace, metrics)
    const start = Blockly.uiPosition.getStartPositionRect(
      corner,
      new Blockly.utils.Size(SPACER_WIDTH_PX, this.height),
      MARGIN_PX,
      0,
      metrics,
      this.workspace,
    )
    const bump =
      corner.vertical === Blockly.uiPosition.verticalPosition.TOP
        ? Blockly.uiPosition.bumpDirection.DOWN
        : Blockly.uiPosition.bumpDirection.UP
    this.rect = Blockly.uiPosition.bumpPositionRect(start, 0, bump, savedPositions)
  }

  getBoundingRectangle(): Blockly.utils.Rect | null {
    return this.rect
  }
}

/** Liga o espaçador num workspace com lixeira ou zoom (idempotente). */
export function installCornerSpacer(
  workspace: Blockly.WorkspaceSvg,
  height = CORNER_SPACER_HEIGHT_PX,
): void {
  const manager = workspace.getComponentManager()
  if (manager.getComponent('szCornerSpacer')) return
  manager.addComponent({
    component: new CornerSpacer(workspace, height),
    weight: SPACER_WEIGHT,
    capabilities: [Blockly.ComponentManager.Capability.POSITIONABLE],
  })
  workspace.resize()
}

/**
 * D8 da proposta: ao ABRIR o projeto, os blocos começam no canto de cima (com um respiro), não
 * no meio da tela com metade do canvas vazio em cima. Só na primeira carga de cada editor: a
 * Ponte recarrega os blocos a cada mudança no código, e a tela não pode pular.
 */
export function showBlocksFromTop(workspace: Blockly.WorkspaceSvg, padding = 24): void {
  try {
    if (workspace.getTopBlocks(false).length === 0) return
    const metrics = workspace.getMetrics()
    workspace.scroll(-metrics.contentLeft + padding, -metrics.contentTop + padding)
  } catch {
    // Editor descartado entre o agendamento e o scroll.
  }
}

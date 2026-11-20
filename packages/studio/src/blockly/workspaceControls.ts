import * as Blockly from 'blockly/core'

/**
 * A lixeira e o zoom do Blockly no Estúdio. Baixado à parte, logo depois da injeção
 * (`installCornerSpacer`, em `cornerSpacer.ts`): o pacote de abertura do modo Blocos está no teto.
 *
 * 1. Mais altos (pedido dela, 08/11/2026: "está muito para baixo e a lixeira está muito
 *    escondida"). O Blockly empilha os controles a partir do canto oposto à paleta, cada um
 *    desviando dos retângulos já ocupados (`savedPositions`). O espaçador invisível ocupa a faixa
 *    de baixo desse canto ANTES da lixeira (peso entre o da paleta solta, 1, e o da lixeira, 2):
 *    lixeira e zoom desviam dele e sobem juntos. Só API pública (`IPositionable` +
 *    `ComponentManager`).
 * 2. A lixeira por cima dos blocos (pedido dela, 20/11/2026). O Blockly 12 põe a lixeira ANTES da
 *    camada dos blocos (`addTrashcan`: `insertBefore(lixeira, canvas)`) e o zoom no fim: os blocos
 *    cobriam a lixeira e a tampa abrindo. Ela vai para logo depois da camada dos balões, onde o
 *    Blockly a punha antes da versão 12, junto do zoom. O bloco que está sendo arrastado continua
 *    por cima de tudo (ele mora noutra camada, a do arrasto).
 * 3. O desenho em vetor (pedido dela, 20/11/2026: "mais feios do que antes"). Os cinco desenhos
 *    (corpo e tampa da lixeira, centralizar, aproximar e afastar) usam o `sprites.svg` do MESMO
 *    SDK instalado (o que o Blockly 13 passou a usar; o servidor de demonstração tirou o
 *    `sprites.png`, e foi por isso que os ícones sumiram antes de 17/11). O `sprites.png` de
 *    96x124 ampliado saía serrilhado em tela densa. O checkmark das listas segue no
 *    `sprites.png`: é fundo de CSS, recortado em pixels.
 *
 * Os três continuam sendo os controles nativos: arrastar para a lixeira, a tampa abrindo, a
 * lixeira com os blocos apagados, o zoom.
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

/** O desenho em vetor do SDK, na mesma pasta de mídia da injeção. */
export const VECTOR_SPRITE = 'sprites.svg'

/**
 * Liga tudo num workspace com lixeira ou zoom (idempotente). Editor já descartado (o módulo
 * chegou depois de fechar): não faz nada.
 */
export function installWorkspaceControls(
  workspace: Blockly.WorkspaceSvg,
  height = CORNER_SPACER_HEIGHT_PX,
): void {
  const root = workspace.getSvgGroup()
  if (!root?.isConnected) return
  const trash = root.querySelector(':scope > .blocklyTrash')
  if (trash) workspace.getBubbleCanvas().after(trash)
  const vector = `${workspace.options.pathToMedia}${VECTOR_SPRITE}`
  for (const image of root.querySelectorAll('.blocklyTrash image, .blocklyZoom image'))
    image.setAttributeNS(Blockly.utils.dom.XLINK_NS, 'xlink:href', vector)
  const manager = workspace.getComponentManager()
  if (!manager.getComponent('szCornerSpacer'))
    manager.addComponent({
      component: new CornerSpacer(workspace, height),
      weight: SPACER_WEIGHT,
      capabilities: [Blockly.ComponentManager.Capability.POSITIONABLE],
    })
  workspace.resize()
  workspace.getInjectionDiv().setAttribute('data-sz-controls', 'ready')
}

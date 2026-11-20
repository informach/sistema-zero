import type * as Blockly from 'blockly/core'

/**
 * O bloco cabe inteiro na vista? Um bloco cujo desenho saiu da página (a montagem sob demanda
 * desmonta os corpos longe da vista) NÃO está à vista: a posição dele, medida subindo pelo DOM,
 * para no nó solto e parece perto da origem. Sem isto o cursor do código selecionava o bloco e
 * não rolava até ele, e o corpo continuava fora da página (revisão da missão, achado C4).
 */
export function isBlockInView(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg): boolean {
  try {
    if (!block.getSvgRoot()?.isConnected) return false
    const metricsManager = workspace.getMetricsManager?.()
    if (!metricsManager || typeof metricsManager.getViewMetrics !== 'function') return false
    const view = metricsManager.getViewMetrics(true) // coordenadas do workspace
    const xy = block.getRelativeToSurfaceXY()
    const size = block.getHeightWidth()
    return (
      xy.x >= view.left &&
      xy.y >= view.top &&
      xy.x + size.width <= view.left + view.width &&
      xy.y + size.height <= view.top + view.height
    )
  } catch {
    return false
  }
}

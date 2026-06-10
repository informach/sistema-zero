import * as Blockly from 'blockly/core'

interface MutableBlock extends Blockly.Block {
  saveExtraState?: () => unknown
}

function extraStateString(block: MutableBlock): string {
  const extra = block.saveExtraState?.()
  return extra == null ? '' : JSON.stringify(extra)
}

/**
 * Executa uma mudança de mutator (`fn`, ex.: clicar no +/− que adiciona um
 * parâmetro ou a herança) e dispara UM evento `BLOCK_CHANGE`/'mutation'. Sem
 * isso, a mudança de forma não notifica os ouvintes do workspace — a Ponte não
 * regenera o código e o undo/redo não funciona. Os eventos ficam desabilitados
 * durante a remontagem da forma para não emitir eventos intermediários.
 * No-op de evento quando os eventos já estão desabilitados (ex.: durante load).
 */
export function withMutation(block: Blockly.Block, fn: () => void): void {
  const b = block as MutableBlock
  if (!Blockly.Events.isEnabled()) {
    fn()
    return
  }
  const before = extraStateString(b)
  Blockly.Events.disable()
  try {
    fn()
  } finally {
    Blockly.Events.enable()
  }
  const svg = block as unknown as Partial<Blockly.BlockSvg>
  if (typeof svg.queueRender === 'function') svg.queueRender()
  else svg.render?.()
  const after = extraStateString(b)
  if (before === after) return
  const BlockChange = Blockly.Events.get(
    Blockly.Events.BLOCK_CHANGE,
  ) as typeof Blockly.Events.BlockChange
  Blockly.Events.fire(new BlockChange(block, 'mutation', null, before, after))
}

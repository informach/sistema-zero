import * as Blockly from 'blockly/core'
import type { PythonBlockOwner } from './contract'

/**
 * A cor dos valores dentro de um bloco de extensão (pedido dela no redesenho de 11/2026): no
 * Python os valores vindos do código são blocos de verdade (não sombras), então um "Olá" dentro
 * de um bloco do Pygame Zero saía na cor da Programação e misturava as cores. Como no Jogo 2D do
 * JavaScript, o valor passa a ter o tom ESCURO do bloco de extensão que o recebe; fora de bloco de
 * extensão, volta à cor dele. Só apresentação: nenhum evento, nenhum passo de desfazer, nada no
 * código nem no estado salvo.
 */
export const PYTHON_LITERAL_TYPES: ReadonlySet<string> = new Set([
  'sz_py_text',
  'sz_py_integer',
  'sz_py_float',
  'sz_py_negative',
  'sz_py_boolean',
  'sz_py_tuple',
])

/** Quanto do preto entra no tom escuro (o mesmo degrau visual das sombras do Jogo 2D). */
const DARKEN = 0.28

const ownColour = new WeakMap<Blockly.Block, string>()

/** O bloco de fora que manda na cor: sobe pelos valores (uma tupla dentro de uma chamada). */
function tintOwner(block: Blockly.Block): Blockly.Block | null {
  let parent = block.getParent()
  while (parent && PYTHON_LITERAL_TYPES.has(parent.type)) parent = parent.getParent()
  return parent
}

export function tintPythonLiterals(
  workspace: Blockly.Workspace,
  ownerOf: (type: string) => PythonBlockOwner | undefined,
): void {
  Blockly.Events.disable()
  try {
    for (const block of workspace.getAllBlocks(false)) {
      if (!PYTHON_LITERAL_TYPES.has(block.type)) continue
      if (!ownColour.has(block)) ownColour.set(block, block.getColour())
      const owner = tintOwner(block)
      const extension = owner ? ownerOf(owner.type) : undefined
      const colour =
        owner && extension && extension !== 'programming'
          ? Blockly.utils.colour.blend('#000000', owner.getColour(), DARKEN)
          : ownColour.get(block)
      if (colour && block.getColour() !== colour) block.setColour(colour)
    }
  } finally {
    Blockly.Events.enable()
  }
}

/**
 * Mantém a cor certa enquanto a criança edita e também na paleta (o flyout recria os blocos a
 * cada categoria aberta). Uma passada por lote de mudanças.
 */
export function attachPythonLiteralTint(
  workspace: Blockly.WorkspaceSvg,
  ownerOf: (type: string) => PythonBlockOwner | undefined,
): () => void {
  const targets = [workspace, workspace.getFlyout()?.getWorkspace()].filter(
    (target): target is Blockly.WorkspaceSvg => Boolean(target),
  )
  const detach = targets.map((target) => {
    let queued = false
    let disposed = false
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent || queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (!disposed) tintPythonLiterals(target, ownerOf)
      })
    }
    target.addChangeListener(listener)
    tintPythonLiterals(target, ownerOf)
    return () => {
      disposed = true
      target.removeChangeListener(listener)
    }
  })
  return () => {
    for (const stop of detach) stop()
  }
}

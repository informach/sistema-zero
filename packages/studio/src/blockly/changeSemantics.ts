interface BlocklyMoveSemantics {
  oldParentId?: string | null
  newParentId?: string | null
  oldInputName?: string | null
  newInputName?: string | null
  oldCoordinate?: unknown | null
  newCoordinate?: unknown | null
}

/**
 * Mover uma pilha solta pela bancada muda apenas o layout serializado. Conectar,
 * desconectar ou trocar de tomada muda o programa e exige reconstruir a IR.
 */
export function isPureWorkspaceLayoutMove(event: BlocklyMoveSemantics): boolean {
  return (
    event.oldParentId == null &&
    event.newParentId == null &&
    event.oldInputName == null &&
    event.newInputName == null &&
    event.oldCoordinate != null &&
    event.newCoordinate != null
  )
}

interface BlocklyEventSemantics extends BlocklyMoveSemantics {
  type?: string
}

/**
 * Os tipos de evento do Blockly que este módulo classifica. Ficam LITERAIS
 * porque o módulo é puro (não arrasta Blockly); o drift em
 * `__tests__/changeSemantics.test.ts` os confere contra `Blockly.Events.*`.
 */
export const BLOCKLY_EVENT_TYPES = {
  finishedLoading: 'finished_loading',
  blockCreate: 'create',
  blockDelete: 'delete',
  blockChange: 'change',
  blockMove: 'move',
} as const

/**
 * O evento mexeu na ESTRUTURA do programa (quem está encaixado em quem)?
 *
 * ⚠️⚠️ `change` entra aqui por causa da MUTAÇÃO de forma: o `+ senão se`, o
 * `+ senão` e o `−` do "Se / senão" — e os mutadores de lista, parâmetros e
 * objeto — remontam os inputs dentro de `Blockly.Events.disable()` e reconectam
 * os filhos. Ou seja, eles SOLTAM e ENCAIXAM pilhas sem emitir um único
 * create/delete/move: o `−` que tira um ramo deixa a pilha daquele ramo
 * flutuando (código morto que não gera nada) e, na direção inversa, uma pilha
 * que volta a ficar encaixada continuava marcada como rascunho. Este é o mesmo
 * conjunto que o listener de regeneração da IR já trata como edição real.
 */
export function isProgramStructureChange(event: BlocklyEventSemantics): boolean {
  switch (event.type) {
    case BLOCKLY_EVENT_TYPES.finishedLoading:
    case BLOCKLY_EVENT_TYPES.blockCreate:
    case BLOCKLY_EVENT_TYPES.blockDelete:
    case BLOCKLY_EVENT_TYPES.blockChange:
      return true
    case BLOCKLY_EVENT_TYPES.blockMove:
      return !isPureWorkspaceLayoutMove(event)
    default:
      return false
  }
}

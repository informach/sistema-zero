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

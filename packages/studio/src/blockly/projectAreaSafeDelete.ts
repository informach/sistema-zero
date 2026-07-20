import * as Blockly from 'blockly/core'

export const PROJECT_AREA_SAFE_DELETE_EXTENSION = 'sz_project_area_safe_delete'

type DisposableProjectArea = Blockly.Block & {
  dispose(healStack?: boolean, animate?: boolean): void
}

/** Solta a pilha antes de o evento de exclusão capturar a árvore da moldura. */
export function registerProjectAreaSafeDeleteExtension(): void {
  if (Blockly.Extensions.isRegistered(PROJECT_AREA_SAFE_DELETE_EXTENSION)) return
  Blockly.Extensions.register(
    PROJECT_AREA_SAFE_DELETE_EXTENSION,
    function (this: DisposableProjectArea): void {
      const disposeArea = this.dispose.bind(this)
      this.dispose = (healStack?: boolean, animate?: boolean): void => {
        if (this.isDeadOrDying()) return
        const previousGroup = Blockly.Events.getGroup()
        if (!previousGroup) Blockly.Events.setGroup(true)
        try {
          // Precisa acontecer ANTES de `disposeArea`: o evento BLOCK_DELETE
          // serializa os filhos. Se soltássemos no hook `destroy`, o undo criaria
          // uma cópia do filho em vez de reconectar o rascunho original.
          const child = this.getInputTargetBlock('CHILDREN')
          if (child && !child.isDeadOrDying()) child.unplug(false)
          disposeArea(healStack, animate)
        } finally {
          if (!previousGroup) Blockly.Events.setGroup(false)
        }
      }
    },
  )
}

import * as Blockly from 'blockly/core'
import { isWorkspaceLoading } from './loadFence'

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
        // ⚠️ CARGA programática (load/clear sob a cerca): o workspace INTEIRO
        // está sendo trocado — aqui NÃO se preserva filho como rascunho. O clear
        // do serializer do Blockly itera um SNAPSHOT dos top blocks; um filho
        // desplugado vira um top NOVO fora do snapshot, SOBREVIVE à limpeza e
        // aparecia como uma pilha órfã ao lado do estado carregado ("duplicou
        // todos os blocos" ao recarregar a Ponte — bug 25/07). O resgate de
        // rascunho é só para a EXCLUSÃO real da moldura pela criança.
        if (isWorkspaceLoading()) {
          disposeArea(healStack, animate)
          return
        }
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

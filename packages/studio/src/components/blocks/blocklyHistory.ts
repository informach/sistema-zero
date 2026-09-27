import * as Blockly from 'blockly/core'
import type { EditorHistoryAdapter } from '../../state/editorHistory'

/**
 * O "confira as pilhas" de cada workspace com a barra ligada. O `clearUndo` do Blockly não
 * dispara evento nenhum, então quem esquece a pilha (`forgetBlocklyHistory`) avisa por aqui: sem
 * isso, uma recarga que não gera evento (o canvas já estava vazio) deixava o "Desfazer" ligado sem
 * ter o que desfazer (full review de 11/09/2026).
 */
const refreshers = new WeakMap<Blockly.Workspace, () => void>()

/**
 * A pilha de desfazer dos BLOCOS para a barra do editor. É a do próprio Blockly (a mesma do
 * Ctrl+Z e do menu de contexto): `workspace.undo(false|true)` e as pilhas `getUndoStack` /
 * `getRedoStack`. Os botões só mudam de estado quando o TAMANHO de uma pilha muda, então os
 * eventos de interface (selecionar, rolar) não re-renderizam a barra.
 */
export function createBlocklyHistory(
  workspace: Blockly.WorkspaceSvg,
): EditorHistoryAdapter & { dispose(): void } {
  const listeners = new Set<() => void>()
  let undoSize = workspace.getUndoStack().length
  let redoSize = workspace.getRedoStack().length

  const check = () => {
    const nextUndo = workspace.getUndoStack().length
    const nextRedo = workspace.getRedoStack().length
    if (nextUndo === undoSize && nextRedo === redoSize) return
    undoSize = nextUndo
    redoSize = nextRedo
    for (const listener of [...listeners]) listener()
  }
  // O Blockly empilha o evento ao DISPARÁ-LO (numa tarefa depois da edição), e é aí que este
  // ouvinte roda: a pilha que ele lê já tem a edição.
  workspace.addChangeListener(check)
  refreshers.set(workspace, check)

  const run = (redo: boolean) => {
    // As mesmas condições do atalho do Blockly: nada durante um arrasto nem num workspace só
    // de leitura, e os menus e dropdowns abertos fecham antes.
    if (workspace.isReadOnly() || Blockly.Gesture.inProgress()) return
    workspace.hideChaff()
    workspace.undo(redo)
    check()
  }

  return {
    undo: () => run(false),
    redo: () => run(true),
    canUndo: () => workspace.getUndoStack().length > 0,
    canRedo: () => workspace.getRedoStack().length > 0,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      workspace.removeChangeListener(check)
      // Só o próprio: na remontagem wide ⇄ narrow o adaptador novo pode já ter se registrado.
      if (refreshers.get(workspace) === check) refreshers.delete(workspace)
      listeners.clear()
    },
  }
}

/**
 * Esquece a pilha de desfazer depois de uma recarga FEITA POR PROGRAMA (a Ponte reconstruindo os
 * blocos a partir do código, um projeto trocado por fora). O Blockly nunca limpa a pilha sozinho
 * (nem `load` nem `clear` chamam `clearUndo`): sem isto, "Desfazer nos blocos" repetia passos de
 * ANTES da recarga, sobre blocos que agora vêm do código. Um evento de antes que ainda esteja na
 * fila do Blockly (ele empilha ao disparar, numa tarefa depois) também não entra: o `clearUndo`
 * do Blockly 12 já chama o `clearPendingUndo` (conferido no `blockly_compressed` da 12.5.1), e a
 * chamada à parte que existia aqui só repetia o esvaziamento da fila. Como o `clearUndo` não gera
 * evento, a barra é avisada à mão.
 */
export function forgetBlocklyHistory(workspace: Blockly.Workspace): void {
  workspace.clearUndo()
  refreshers.get(workspace)?.()
}

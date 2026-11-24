import * as Blockly from 'blockly/core'

/**
 * Carrega um estado salvo no workspace e, se o `load` do Blockly lançar, devolve o estado GLOBAL
 * que ele muda no começo e só desfaz no fim (revisão do lote 3 da missão, 21/11/2026).
 *
 * O `serialization.workspaces.load` do Blockly 12 desliga a gravação do desfazer, abre um grupo
 * de eventos, liga o cache de largura de texto e para o redimensionar, e não tem try/finally:
 * quando um bloco lança no meio (uma sequência longa demais, por exemplo), tudo isso fica para
 * trás. O próximo projeto aberto na mesma página ficava sem "Desfazer", com os eventos num grupo
 * velho. O erro segue para quem chamou: quem decide o que mostrar é o painel.
 */
export function loadWorkspaceState(
  state: Parameters<typeof Blockly.serialization.workspaces.load>[0],
  workspace: Blockly.Workspace,
) {
  const recordUndo = Blockly.Events.getRecordUndo()
  const group = Blockly.Events.getGroup()
  try {
    Blockly.serialization.workspaces.load(state, workspace)
  } catch (error) {
    Blockly.Events.setGroup(group)
    Blockly.Events.setRecordUndo(recordUndo)
    // O `load` liga o cache antes de carregar qualquer serializador, e é num deles que ele lança.
    Blockly.utils.dom.stopTextWidthCache()
    if (workspace instanceof Blockly.WorkspaceSvg) workspace.setResizesEnabled(true)
    throw error
  }
}

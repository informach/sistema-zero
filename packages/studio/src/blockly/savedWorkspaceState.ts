import * as Blockly from 'blockly/core'
import { markLifecycleBlocksState } from './blocksStateVersion'
import { jsonPlainCopy } from './jsonPlainCopy'

/**
 * O estado do workspace como o Estúdio guarda: o `save` do Blockly copiado para objetos comuns
 * (`jsonPlainCopy`) e marcado com a versão das áreas. Todo estado que sai do Blockly para o
 * projeto passa por aqui, para nunca chegar ao store, à Ponte ou à nuvem um objeto sem protótipo
 * que o `JSON.stringify` do V8 só consegue ler com recursão.
 */
export function saveWorkspaceState(workspace: Blockly.Workspace) {
  return markLifecycleBlocksState(
    jsonPlainCopy(Blockly.serialization.workspaces.save(workspace)) as ReturnType<
      typeof Blockly.serialization.workspaces.save
    >,
  )
}

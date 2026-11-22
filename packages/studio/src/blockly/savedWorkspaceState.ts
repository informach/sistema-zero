import * as Blockly from 'blockly/core'
import { markLifecycleBlocksState } from './blocksStateVersion'
import { jsonPlainCopy } from './jsonPlainCopy'
import { keepShownBlocksCollapsed } from './transientExpansion'

/**
 * O estado do workspace como o Estúdio guarda: o `save` do Blockly copiado para objetos comuns
 * (`jsonPlainCopy`) e marcado com a versão das áreas. Todo estado que sai do Blockly do Clássico
 * em JavaScript (`BlocklyPanel`) passa por aqui, para nunca chegar ao store, à Ponte ou à nuvem um
 * objeto sem protótipo que o `JSON.stringify` do V8 só consegue ler com recursão.
 *
 * ⚠️ O Python ainda NÃO passa por aqui: `python/blocks/workspaceState.ts` copia o `save` cru com
 * `structuredClone`, que no Chromium 159 estoura com 859 blocos numa cadeia (medido em 21/11/2026,
 * `docs/estudio-evolucao/classico-em-escala.md`). É o lote 3 do plano.
 */
export function saveWorkspaceState(workspace: Blockly.Workspace) {
  const state = jsonPlainCopy(Blockly.serialization.workspaces.save(workspace)) as ReturnType<
    typeof Blockly.serialization.workspaces.save
  >
  // Um bloco aberto só para mostrar outro continua salvo recolhido (`transientExpansion.ts`).
  keepShownBlocksCollapsed(workspace, state)
  return markLifecycleBlocksState(state)
}

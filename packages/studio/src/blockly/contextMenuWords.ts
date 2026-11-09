import * as Blockly from 'blockly/core'

/**
 * Palavras de criança no menu do botão direito (redesenho do clássico, 11/2026). Troca SÓ o
 * texto dos itens nativos do Blockly, preservando callback, precondição e peso (o comportamento
 * continua sendo o dele), e acrescenta "Perguntar ao Zappy sobre este bloco".
 *
 * ⚠️ "Organizar blocos" (o `sz_organize` do Estúdio) é âncora do robô das aulas gravadas e fica
 * como está; o "Arrumar blocos" nativo, que fazia quase o mesmo, sai do menu (eram dois itens
 * para a mesma ideia).
 */
type ActionRegistryItem = Exclude<Blockly.ContextMenuRegistry.RegistryItem, { separator: true }>
type Scope = Blockly.ContextMenuRegistry.Scope

/** Abridor do Zappy por workspace (o Estúdio liga quando o tutor está configurado). */
export interface ZappyOpenerWorkspace {
  __szAskZappy?: (block: Blockly.Block) => void
}

export const BLOCK_MENU_WORDS: Readonly<Record<string, (scope: Scope) => string>> = {
  blockDuplicate: () => 'Duplicar',
  blockComment: (scope) =>
    scope.block?.getCommentText() ? 'Tirar o recado' : 'Escrever um recado',
  blockInline: (scope) =>
    scope.block?.getInputsInline() ? 'Encaixes um embaixo do outro' : 'Encaixes na mesma linha',
  blockCollapseExpand: (scope) => (scope.block?.isCollapsed() ? 'Abrir o bloco' : 'Fechar o bloco'),
  blockDisable: (scope) => (scope.block?.isEnabled() ? 'Desligar o bloco' : 'Ligar o bloco'),
  collapseWorkspace: () => 'Fechar todos os blocos',
  expandWorkspace: () => 'Abrir todos os blocos',
  sz_copy_blocks: () => 'Copiar',
  sz_paste_blocks: () => 'Colar',
}

let patched = false

export function patchContextMenuWords(): void {
  if (patched) return
  const registry = Blockly.ContextMenuRegistry.registry
  for (const [id, displayText] of Object.entries(BLOCK_MENU_WORDS)) {
    const native = registry.getItem(id)
    if (!native || !('callback' in native)) continue
    registry.unregister(id)
    registry.register({ ...(native as ActionRegistryItem), displayText })
  }
  const clean = registry.getItem('cleanWorkspace')
  if (clean && 'callback' in clean) {
    registry.unregister('cleanWorkspace')
    registry.register({ ...(clean as ActionRegistryItem), preconditionFn: () => 'hidden' })
  }
  if (!registry.getItem('sz_ask_zappy'))
    registry.register({
      id: 'sz_ask_zappy',
      weight: 50,
      scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
      displayText: () => 'Perguntar ao Zappy sobre este bloco',
      preconditionFn: (scope) =>
        scope.block && (scope.block.workspace as unknown as ZappyOpenerWorkspace).__szAskZappy
          ? 'enabled'
          : 'hidden',
      callback: (scope) => {
        const block = scope.block
        if (!block) return
        ;(block.workspace as unknown as ZappyOpenerWorkspace).__szAskZappy?.(block)
      },
    })
  patched = true
}

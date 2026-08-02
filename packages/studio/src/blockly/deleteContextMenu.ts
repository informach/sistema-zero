import * as Blockly from 'blockly/core'

/**
 * O "Deletar N blocos" do menu de contexto contava coisa que a CRIANÇA NÃO VÊ.
 *
 * O item nativo do Blockly (`core/contextmenu_items`) faz
 * `block.getDescendants(false).length` — e, para o Blockly, cada soquete
 * PREENCHIDO é um bloco de verdade (bloco-sombra). Como aqui todo soquete nasce
 * preenchido (regra das sombras na paleta), um único "Mover o sprite ⟨heroi⟩,
 * velocidade ⟨4⟩ pulo ⟨11⟩" aparecia como **"Deletar 3 blocos"**. A criança lê
 * três e vê um.
 *
 * Aqui a conta passa a ser só o que ela enxerga: blocos de verdade, sem as
 * bolinhas de valor. O que já estava certo no nativo fica: a pilha ABAIXO do
 * bloco sobrevive ao apagar (o Blockly religa), então não entra na conta.
 */

/** Blocos que a criança VÊ e que somem junto com este. Inclui o próprio. */
export function visibleBlockCount(block: Blockly.Block): number {
  const next = block.getNextBlock()
  const survives = next ? new Set(next.getDescendants(false).map((b) => b.id)) : null
  return block.getDescendants(false).filter((b) => !b.isShadow() && !survives?.has(b.id)).length
}

/** Espelha o `getDeletableBlocks_` nativo (recursão por filhos), sem as sombras. */
export function visibleDeletableCount(workspace: Blockly.Workspace): number {
  const out: Blockly.Block[] = []
  const walk = (block: Blockly.Block): void => {
    if (block.isDeletable()) out.push(...block.getDescendants(false))
    else for (const child of block.getChildren(false)) walk(child)
  }
  for (const top of workspace.getTopBlocks(true)) walk(top)
  return out.filter((b) => !b.isShadow()).length
}

/**
 * Texto do apagar de UM bloco. O número só aparece quando avisa algo de verdade
 * (tem coisa dentro que vai junto) — senão é ruído para quem está aprendendo.
 */
export function deleteBlockLabel(count: number): string {
  if (count <= 1) return 'Apagar este bloco'
  if (count === 2) return 'Apagar este bloco e o de dentro'
  return `Apagar este bloco e os ${count - 1} de dentro`
}

/** Texto do apagar TUDO (menu do canvas). Aqui o número informa mesmo. */
export function deleteAllLabel(count: number): string {
  return count === 1 ? 'Apagar o bloco' : `Apagar os ${count} blocos`
}

/** O ramo "item clicável" da união do registry (o Blockly não exporta o nome). */
type ActionRegistryItem = Exclude<Blockly.ContextMenuRegistry.RegistryItem, { separator: true }>

let patched = false

/**
 * Troca SÓ o texto dos dois itens nativos de apagar (`blockDelete` no bloco e
 * `workspaceDelete` no canvas), preservando callback/precondição/peso do
 * Blockly — o comportamento de apagar continua sendo o dele.
 */
export function patchDeleteContextMenus(): void {
  if (patched) return
  const registry = Blockly.ContextMenuRegistry.registry
  const swap = (id: string, displayText: (scope: Blockly.ContextMenuRegistry.Scope) => string) => {
    const native = registry.getItem(id)
    // O registro é uma união (ação | separador); só ação tem callback p/ preservar.
    if (!native || !('callback' in native)) return
    const action = native as ActionRegistryItem
    registry.unregister(id)
    registry.register({ ...action, displayText })
  }
  swap('blockDelete', (scope) => {
    const block = scope.block
    return block ? deleteBlockLabel(visibleBlockCount(block)) : ''
  })
  swap('workspaceDelete', (scope) => {
    const workspace = scope.workspace
    return workspace ? deleteAllLabel(visibleDeletableCount(workspace)) : ''
  })
  patched = true
}

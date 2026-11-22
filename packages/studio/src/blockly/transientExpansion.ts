import * as Blockly from 'blockly/core'

/**
 * Blocos abertos SÓ para mostrar outro bloco (lote 2 da conclusão, 22/11/2026). "Mostrar o bloco"
 * (a busca, o cursor do código, o erro do jogo) abre a função recolhida que envolve o alvo. Antes
 * isso era uma edição como outra qualquer: entrava no desfazer, regerava o código do projeto
 * inteiro (7 mil blocos no Reino Zero Ultra), salvava e subia para a conta.
 *
 * Agora a abertura acontece com os eventos desligados (`expandForShowing`) e o bloco fica marcado
 * aqui: o estado salvo (`keepShownBlocksCollapsed`, chamado pelo `saveWorkspaceState`) continua
 * gravando-o recolhido, então o projeto salvo é o de antes. A marca sai quando a criança mexe no
 * bloco ou em algo dentro dele, recolhe ou abre de propósito, ou o apaga: a partir daí vale o que
 * está na tela.
 */
const shown = new WeakMap<Blockly.Workspace, Set<string>>()
const listening = new WeakSet<Blockly.Workspace>()

type Node = Record<string, unknown>

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Abre `block` sem evento (sem desfazer, sem regerar nem salvar) e o marca como só mostrado. */
export function expandForShowing(block: Blockly.BlockSvg): void {
  if (!block.isCollapsed()) return
  const workspace = block.workspace
  const wasEnabled = Blockly.Events.isEnabled()
  if (wasEnabled) Blockly.Events.disable()
  try {
    block.setCollapsed(false)
  } finally {
    if (wasEnabled) Blockly.Events.enable()
  }
  let ids = shown.get(workspace)
  if (!ids) {
    ids = new Set()
    shown.set(workspace, ids)
  }
  ids.add(block.id)
  if (!listening.has(workspace)) {
    listening.add(workspace)
    workspace.addChangeListener((event) => forgetTouched(workspace, event))
  }
}

/** A criança mexeu: o bloco marcado (ou o que envolve o bloco mexido) passa a valer como está. */
function forgetTouched(workspace: Blockly.Workspace, event: Blockly.Events.Abstract): void {
  const ids = shown.get(workspace)
  if (!ids || ids.size === 0 || event.isUiEvent) return
  if (event instanceof Blockly.Events.BlockDelete) {
    for (const id of event.ids ?? []) ids.delete(id)
    return
  }
  const touched: Array<string | undefined> = []
  if (event instanceof Blockly.Events.BlockBase) touched.push(event.blockId)
  if (event instanceof Blockly.Events.BlockMove) touched.push(event.oldParentId, event.newParentId)
  for (const id of touched) {
    for (
      let block = id ? workspace.getBlockById(id) : null;
      block;
      block = block.getSurroundParent()
    )
      ids.delete(block.id)
  }
}

/** O bloco foi aberto só para mostrar (e a criança ainda não mexeu nele)? */
export function isShownOnly(block: Blockly.Block): boolean {
  return shown.get(block.workspace)?.has(block.id) ?? false
}

/** `collapsed: true` no lugar em que o Blockly o grava: depois de `type`/`id` e das coordenadas. */
function withCollapsed(node: Node): Node {
  if (node.collapsed === true) return node
  const anchor = 'y' in node ? 'y' : 'id' in node ? 'id' : 'type'
  const out: Node = {}
  for (const [key, value] of Object.entries(node)) {
    out[key] = value
    if (key === anchor) out.collapsed = true
  }
  if (!('collapsed' in out)) out.collapsed = true
  return out
}

/**
 * No estado salvo, os blocos abertos só para mostrar continuam recolhidos, com as chaves na mesma
 * ordem que o Blockly grava: o texto salvo é o mesmo de antes de mostrar. Muda `state` no lugar
 * (é a cópia do `saveWorkspaceState`).
 */
export function keepShownBlocksCollapsed(workspace: Blockly.Workspace, state: unknown): void {
  const ids = shown.get(workspace)
  if (!ids || ids.size === 0 || !isNode(state) || !isNode(state.blocks)) return
  const top = state.blocks.blocks
  if (!Array.isArray(top)) return
  // Cada item: o contêiner e a chave onde mora o bloco (para trocar o objeto mantendo a ordem).
  const pending: Array<[Node | unknown[], string | number]> = top.map(
    (_, index) => [top, index] as [unknown[], number],
  )
  while (pending.length > 0) {
    const [container, key] = pending.pop()!
    const node = (container as Record<string | number, unknown>)[key]
    if (!isNode(node)) continue
    let current = node
    if (typeof node.id === 'string' && ids.has(node.id)) {
      current = withCollapsed(node)
      ;(container as Record<string | number, unknown>)[key] = current
    }
    if (isNode(current.inputs))
      for (const input of Object.values(current.inputs))
        if (isNode(input)) {
          if (isNode(input.block)) pending.push([input, 'block'])
          if (isNode(input.shadow)) pending.push([input, 'shadow'])
        }
    if (isNode(current.next) && isNode(current.next.block)) pending.push([current.next, 'block'])
  }
}

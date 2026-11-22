import * as Blockly from 'blockly/core'

/**
 * Blocos abertos SÓ para mostrar outro bloco (lote 2 da conclusão, 22/11/2026). "Mostrar o bloco"
 * (a busca, o cartão do palco, os Problemas e o Investigar, pelo `revealBlock` do painel; o cursor
 * do código só seleciona e centraliza) abre a função recolhida que envolve o alvo. Antes
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
/** Os grupos de eventos dos últimos gestos de mostrar, por workspace (os mais novos no fim). */
const showingGroups = new WeakMap<Blockly.Workspace, string[]>()
/** Quantos grupos guardar: os eventos de um gesto chegam ao ouvinte no máximo alguns quadros depois. */
const SHOWING_GROUPS_KEPT = 16
let showingSequence = 0

/**
 * Roda o gesto de mostrar (abrir, centralizar, selecionar) num grupo de eventos PRÓPRIO, sem
 * desfazer, e desenha o que ficou na fila antes de sair (full review final, 22/11/2026). O Blockly
 * guarda o grupo e o "vai para o desfazer" de cada evento quando o evento NASCE, e o afastamento
 * que o desenho faz (`bumpNeighbours` no `doRenders`, logo depois de desenhar) nasce aqui dentro:
 * - ele é reconhecido pelo grupo (`isBumpWhileShowing`), e não por um relógio. A janela de 2 s
 *   começava antes do desenho caro, e numa máquina lenta o evento chegava depois dela: o projeto
 *   salvo mudava;
 * - ele não entra no desfazer, que apagava o refazer da criança, e o Ctrl+Z seguinte devolvia a
 *   pilha solta para cima da função aberta.
 */
export function withShowingScope<T>(workspace: Blockly.Workspace, run: () => T): T {
  showingSequence += 1
  const group = `sz-mostrar-${showingSequence}`
  const groups = showingGroups.get(workspace) ?? []
  groups.push(group)
  if (groups.length > SHOWING_GROUPS_KEPT) groups.splice(0, groups.length - SHOWING_GROUPS_KEPT)
  showingGroups.set(workspace, groups)
  const previousGroup = Blockly.Events.getGroup()
  const previousRecordUndo = Blockly.Events.getRecordUndo()
  Blockly.Events.setGroup(group)
  Blockly.Events.setRecordUndo(false)
  try {
    const result = run()
    // O que o gesto pôs na fila de desenho é desenhado ainda dentro dele: um afastamento feito no
    // quadro seguinte nasceria fora do grupo e com o desfazer ligado.
    if (workspace.rendered)
      Blockly.renderManagement.triggerQueuedRenders(workspace as Blockly.WorkspaceSvg)
    return result
  } finally {
    Blockly.Events.setRecordUndo(previousRecordUndo)
    Blockly.Events.setGroup(previousGroup || false)
  }
}

/** O evento nasceu dentro de um gesto de mostrar (`withShowingScope`)? */
function isShowingEvent(workspace: Blockly.Workspace, event: Blockly.Events.Abstract): boolean {
  return Boolean(event.group) && (showingGroups.get(workspace) ?? []).includes(event.group)
}

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
    workspace.addChangeListener((event) => forgetShownWhenTouched(workspace, event))
  }
}

/**
 * A criança mexeu: o bloco marcado (ou o que envolve o bloco mexido) passa a valer como está. O
 * painel chama também no começo do ouvinte dele: o ouvinte daqui foi registrado depois, e um
 * arrasto da função mostrada era gravado ainda com ela recolhida (revisão do lote 2).
 */
export function forgetShownWhenTouched(
  workspace: Blockly.Workspace,
  event: Blockly.Events.Abstract,
): void {
  const ids = shown.get(workspace)
  if (!ids || ids.size === 0 || event.isUiEvent || isShowingEvent(workspace, event)) return
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

/**
 * Um afastamento automático do Blockly (`moveBy(…, ['bump'])`: o corpo da função aberta passou
 * por cima de uma pilha solta, que é afastada) feito durante um gesto de mostrar
 * (`withShowingScope`). O afastamento aparece na tela, mas não é gravado como mudança de layout: o
 * projeto salvo continua o de antes, com a função recolhida. Na próxima gravação de verdade as
 * posições da tela entram. Afastamento de outro gesto é gravado como sempre.
 */
export function isBumpWhileShowing(
  workspace: Blockly.Workspace,
  event: Blockly.Events.Abstract,
): boolean {
  return (
    event instanceof Blockly.Events.BlockMove &&
    (event.reason ?? []).includes('bump') &&
    isShowingEvent(workspace, event)
  )
}

/**
 * Os dois estados salvos (texto do `saveWorkspaceState`) só diferem na posição das pilhas soltas?
 * É o que sobra de um afastamento que não foi gravado (`isBumpWhileShowing`): a gravação de saída e
 * o Jogar comparam o canvas com o último estado aplicado, e sem isto regeneravam e gravavam o
 * projeto inteiro só pela pilha afastada (revisão do lote 2, 22/11/2026).
 */
export function differsOnlyInStackPositions(a: string, b: string): boolean {
  const withoutPositions = (text: string): string | null => {
    try {
      const state: unknown = JSON.parse(text)
      if (!isNode(state) || !isNode(state.blocks) || !Array.isArray(state.blocks.blocks))
        return null
      for (const node of state.blocks.blocks)
        if (isNode(node)) {
          delete node.x
          delete node.y
        }
      return JSON.stringify(state)
    } catch {
      return null
    }
  }
  const left = withoutPositions(a)
  return left !== null && left === withoutPositions(b)
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

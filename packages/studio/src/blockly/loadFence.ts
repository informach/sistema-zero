/**
 * Cerca de carga programática do workspace. Durante um
 * `Blockly.serialization.workspaces.load` (ou um `workspace.clear`), o Blockly
 * emite UM evento por bloco (N × `BLOCK_CREATE`/`BLOCK_DELETE`). Como cada bloco
 * com `onchange` é um listener do workspace, processar esses eventos
 * intermediários faria cada um dos M blocos com mutator varrer o workspace
 * inteiro a cada evento — O(N·M) só para abrir um projeto grande.
 *
 * A solução NÃO é desabilitar os eventos (isso suprimiria também o
 * `FINISHED_LOADING` final, do qual os mutadores de argumento dependem para
 * resolver a assinatura/rótulos uma única vez pós-carga). Em vez disso, marcamos
 * que uma carga está em voo e os `onchange` caros ignoram os eventos
 * intermediários, deixando passar só o `FINISHED_LOADING`.
 *
 * Contador (não booleano) para tolerar reentrância/instâncias múltiplas. As
 * cargas são SÍNCRONAS (o `load()`/`clear()` roda até o fim sem await), então
 * não há intercalação entre instâncias na thread única — o begin/end sempre
 * envolve exatamente a carga correspondente.
 */
let loadDepth = 0

export function beginWorkspaceLoad(): void {
  loadDepth += 1
}

export function endWorkspaceLoad(): void {
  loadDepth = Math.max(0, loadDepth - 1)
}

export function isWorkspaceLoading(): boolean {
  return loadDepth > 0
}

/** Executa `fn` com a cerca de carga ativa, garantindo o `end` mesmo se lançar. */
export function withWorkspaceLoad<T>(fn: () => T): T {
  beginWorkspaceLoad()
  try {
    return fn()
  } finally {
    endWorkspaceLoad()
  }
}

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
 * The legacy counter covers synchronous operations. Incremental loads use the
 * workspace-keyed fence, so yielding never blocks another editor instance.
 */
let loadDepth = 0
const workspaceLoads = new WeakMap<object, number>()

export function beginWorkspaceLoad(workspace?: object): void {
  if (workspace) workspaceLoads.set(workspace, (workspaceLoads.get(workspace) ?? 0) + 1)
  else loadDepth += 1
}

export function endWorkspaceLoad(workspace?: object): void {
  if (workspace) {
    const remaining = (workspaceLoads.get(workspace) ?? 0) - 1
    if (remaining > 0) workspaceLoads.set(workspace, remaining)
    else workspaceLoads.delete(workspace)
  } else loadDepth = Math.max(0, loadDepth - 1)
}

export function isWorkspaceLoading(workspace?: object): boolean {
  return loadDepth > 0 || Boolean(workspace && workspaceLoads.has(workspace))
}

export function isScopedWorkspaceLoading(workspace: object): boolean {
  return workspaceLoads.has(workspace)
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

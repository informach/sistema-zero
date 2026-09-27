/**
 * MIGRAÇÃO do bloco "Se / senão" (`sz_js_if_else`) para o modelo com MUTATOR.
 *
 * Antes, o bloco tinha um "senão" (input `ELSE`) SEMPRE presente na definição.
 * Agora o "senão"/"senão se" é criado por um mutator e o estado vive no
 * `extraState` (`{ elseIf, hasElse }`). Um projeto SALVO antes disso tem o input
 * `ELSE` (com filhos) e NENHUM `extraState` — ao carregar com o mutator novo, a
 * forma padrão não tem `ELSE`, então o Blockly NÃO reconectaria os filhos do
 * "senão" e o código da criança se PERDERIA.
 *
 * Esta migração roda no carregamento (dentro de `normalizeBlocksStateToFrames`),
 * ANTES do `Blockly.serialization.workspaces.load`: para todo `sz_js_if_else`
 * SEM `extraState` que tenha um input `ELSE`, injeta `extraState: { hasElse: true }`
 * (o mutator então recria o `ELSE` e os filhos reconectam). Um "senão" VAZIO não é
 * serializado (Blockly omite inputs sem filho), então ele simplesmente some — que é
 * a limpeza desejada ("não ficar com senão desnecessário"). Idempotente: blocos
 * novos já trazem `extraState`, então são pulados.
 */

interface BlockNode {
  type?: string
  extraState?: unknown
  inputs?: Record<string, { block?: BlockNode; shadow?: BlockNode }>
  next?: { block?: BlockNode; shadow?: BlockNode }
  [k: string]: unknown
}

const IF_TYPE = 'sz_js_if_else'

/** O bloco (ou algum descendente) é um "Se" legado a migrar? (read-only, barato) */
function ifNeedsMigration(block: BlockNode): boolean {
  if (
    block.type === IF_TYPE &&
    block.extraState == null &&
    block.inputs &&
    'ELSE' in block.inputs
  ) {
    return true
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block && ifNeedsMigration(input.block)) return true
      if (input.shadow && ifNeedsMigration(input.shadow)) return true
    }
  }
  if (block.next?.block && ifNeedsMigration(block.next.block)) return true
  if (block.next?.shadow && ifNeedsMigration(block.next.shadow)) return true
  return false
}

/** Muta o bloco (já clonado) marcando `extraState.hasElse` nos "Se" legados com `ELSE`. */
function migrateBlock(block: BlockNode): void {
  if (
    block.type === IF_TYPE &&
    block.extraState == null &&
    block.inputs &&
    'ELSE' in block.inputs
  ) {
    block.extraState = { hasElse: true }
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block) migrateBlock(input.block)
      if (input.shadow) migrateBlock(input.shadow)
    }
  }
  if (block.next?.block) migrateBlock(block.next.block)
  if (block.next?.shadow) migrateBlock(block.next.shadow)
}

/**
 * Marca `extraState.hasElse` em TODO `sz_js_if_else` legado (com `ELSE`, sem
 * `extraState`) no `blocksState`. Devolve o ESTADO ORIGINAL (mesma referência)
 * quando não há nada a migrar — chamadores que comparam por identidade não pagam
 * um clone à toa.
 */
export function migrateIfElseBlocks(state: unknown): unknown {
  if (!state || typeof state !== 'object') return state
  const top = (state as { blocks?: { blocks?: BlockNode[] } }).blocks?.blocks
  if (!Array.isArray(top)) return state
  if (!top.some((b) => b && ifNeedsMigration(b))) return state
  const cloned = JSON.parse(JSON.stringify(state)) as { blocks?: { blocks?: BlockNode[] } }
  for (const block of cloned.blocks?.blocks ?? []) {
    if (block) migrateBlock(block)
  }
  return cloned
}

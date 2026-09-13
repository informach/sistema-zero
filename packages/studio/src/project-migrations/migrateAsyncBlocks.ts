/**
 * Migração dos blocos que perderam o campo `ASYNC` quando a espera virou um
 * bloco PRÓPRIO (08/2026).
 *
 * A palavra "assíncrona" aparecia na cara do bloco mais básico de função, para
 * quem nunca ouviu falar de Promise. A separação tirou o campo de
 * `sz_js_function`/`sz_js_class_method` e criou os irmãos
 * `sz_js_function_async`/`sz_js_class_method_async`.
 *
 * ⚠️ Sem esta migração, um projeto salvo com `ASYNC: 'TRUE'` perderia a espera
 * em SILÊNCIO: o campo simplesmente não existiria mais no bloco, e o `await` lá
 * dentro passaria a ser inválido sem que nada explicasse por quê.
 */

const ASYNC_REPLACEMENT: Readonly<Record<string, string>> = {
  sz_js_function: 'sz_js_function_async',
  sz_js_class_method: 'sz_js_class_method_async',
}

interface SerializedBlock {
  type?: unknown
  fields?: unknown
  [key: string]: unknown
}

function migrateBlock(block: SerializedBlock): boolean {
  let changed = false
  const type = typeof block.type === 'string' ? block.type : ''
  const replacement = ASYNC_REPLACEMENT[type]
  const fields = block.fields
  if (replacement && typeof fields === 'object' && fields !== null) {
    const record = fields as Record<string, unknown>
    if ('ASYNC' in record) {
      // 'TRUE' vira o bloco irmão; 'FALSE' só perde o campo que não existe mais.
      if (record.ASYNC === 'TRUE') block.type = replacement
      delete record.ASYNC
      if (Object.keys(record).length === 0) delete block.fields
      changed = true
    }
  }
  for (const [key, value] of Object.entries(block)) {
    if (key === 'fields' || key === 'type') continue
    if (visitUnknown(value)) changed = true
  }
  return changed
}

function visitUnknown(value: unknown): boolean {
  if (Array.isArray(value)) {
    let changed = false
    for (const child of value) if (visitUnknown(child)) changed = true
    return changed
  }
  if (typeof value !== 'object' || value === null) return false
  return migrateBlock(value as SerializedBlock)
}

/**
 * Troca o tipo dos blocos que guardavam `ASYNC: 'TRUE'` e remove o campo morto.
 * Devolve a MESMA referência quando não há nada a migrar, preservando a
 * idempotência esperada pelo `normalizeBlocksStateToFrames`.
 */
export function migrateAsyncBlocks(state: unknown): unknown {
  if (typeof state !== 'object' || state === null) return state
  const cloned = structuredClone(state)
  return visitUnknown(cloned) ? cloned : state
}

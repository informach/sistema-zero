export interface ObjectDeleteOperations {
  deleteMany(keys: readonly string[]): Promise<{ failedKeys?: readonly string[] }>
  deleteOne(key: string): Promise<void>
  onBatchFailure?(error: unknown, keys: readonly string[]): void
  onPartialFailure?(failedKeys: readonly string[]): void
}

/** Delete em lotes de até 1000, com fallback unitário para falha total ou parcial. */
export async function deleteObjectKeysResilient(
  keys: readonly string[],
  operations: ObjectDeleteOperations,
): Promise<void> {
  const unique = [...new Set(keys.filter((key) => key.length > 0))]
  for (let offset = 0; offset < unique.length; offset += 1000) {
    const batch = unique.slice(offset, offset + 1000)
    if (batch.length === 1) {
      await operations.deleteOne(batch[0] as string)
      continue
    }
    let result: { failedKeys?: readonly string[] }
    try {
      result = await operations.deleteMany(batch)
    } catch (error) {
      operations.onBatchFailure?.(error, batch)
      for (const key of batch) await operations.deleteOne(key)
      continue
    }
    const failedKeys = [...new Set(result?.failedKeys ?? [])]
    if (failedKeys.length === 0) continue
    operations.onPartialFailure?.(failedKeys)
    for (const key of failedKeys) await operations.deleteOne(key)
  }
}

export interface ObjectPrefixDeleteOperations extends ObjectDeleteOperations {
  listFirstPage(prefix: string): Promise<readonly string[]>
}

/**
 * Apaga cada prefixo relendo sempre a primeira página. Assim uma coleção que
 * encolhe não pula chaves e o retorno confirma uma página vazia.
 */
export async function deleteObjectPrefixes(
  prefixes: readonly string[],
  operations: ObjectPrefixDeleteOperations,
  maxBatchesPerPrefix = 100_000,
): Promise<void> {
  for (const prefix of new Set(prefixes)) {
    for (let batch = 0; batch < maxBatchesPerPrefix; batch += 1) {
      const keys = await operations.listFirstPage(prefix)
      if (keys.length === 0) break
      await deleteObjectKeysResilient(keys, operations)
      if (batch === maxBatchesPerPrefix - 1) {
        throw new Error(`Limpeza de objetos excedeu o teto sob ${prefix}`)
      }
    }
  }
}

export interface PendingEditorEdits {
  register(flush: () => void): () => void
  flush(): void
}

/**
 * Coordena buffers síncronos mantidos pelos editores de uma instância do Studio.
 *
 * Alguns editores agrupam eventos antes de materializá-los no Project. Antes de
 * expor um snapshot ao host, o Studio precisa pedir que esses buffers escrevam
 * sua versão atual na store da instância.
 */
export function createPendingEditorEdits(): PendingEditorEdits {
  const flushers = new Set<() => void>()

  return {
    register(flush) {
      flushers.add(flush)
      return () => flushers.delete(flush)
    },
    flush() {
      for (const flush of [...flushers]) flush()
    },
  }
}

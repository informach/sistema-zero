/**
 * Desfazer/refazer genérico por SNAPSHOTS imutáveis com orçamento em BYTES.
 * As operações de desenho retornam bitmaps novos só do quadro editado
 * (structural sharing), então cada snapshot é barato — mas um fundo 480×360
 * custa ~170 KB, por isso o orçamento derruba os passos mais antigos em vez de
 * limitar por contagem.
 *
 * Uso: `record(estadoAntesDaMutação)` a cada gesto commitado;
 * `undo(estadoAtual)` devolve o snapshot anterior e empurra o atual p/ o redo.
 */
export interface HistoryApi<T> {
  record(snapshot: T): void
  undo(current: T): T | null
  redo(current: T): T | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

const DEFAULT_BYTE_BUDGET = 16_000_000

export function createHistory<T>(options: {
  sizeOf: (snapshot: T) => number
  byteBudget?: number
}): HistoryApi<T> {
  const budget = options.byteBudget ?? DEFAULT_BYTE_BUDGET
  const past: T[] = []
  const future: T[] = []

  function trimToBudget(): void {
    let total = past.reduce((sum, s) => sum + options.sizeOf(s), 0)
    // Mantém pelo menos 1 passo mesmo que um snapshot sozinho estoure o
    // orçamento — desfazer uma vez sempre funciona.
    while (total > budget && past.length > 1) {
      const dropped = past.shift()
      if (dropped !== undefined) total -= options.sizeOf(dropped)
    }
  }

  return {
    record(snapshot) {
      past.push(snapshot)
      // Um gesto novo invalida o redo (padrão universal de editores).
      future.length = 0
      trimToBudget()
    },
    undo(current) {
      const prev = past.pop()
      if (prev === undefined) return null
      future.push(current)
      return prev
    },
    redo(current) {
      const next = future.pop()
      if (next === undefined) return null
      past.push(current)
      return next
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past.length = 0
      future.length = 0
    },
  }
}

/** Bytes aproximados de um bitmap (payload dominante dos snapshots). */
export function bitmapBytes(bitmap: { data: Uint8Array }): number {
  return bitmap.data.byteLength + 64
}

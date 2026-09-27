/**
 * Desfazer/refazer genérico por SNAPSHOTS imutáveis com orçamento em BYTES
 * (cópia por valor do `core/history.ts` do Pinta). As operações de edição
 * devolvem objetos novos só do que mudou (structural sharing), então cada
 * snapshot é barato — mas um modelo com 128 peças pintadas passa de 700 KB, por
 * isso o orçamento derruba os passos mais antigos em vez de limitar por contagem.
 *
 * Uso: `record(estadoAntesDaMutação)` a cada gesto commitado;
 * `undo(estadoAtual)` devolve o snapshot anterior e empurra o atual p/ o redo.
 */
export interface HistoryApi<T> {
  record(snapshot: T, current?: T): void
  /** Rebase the most recent entry when Adjust replaces the result of one command. */
  amend(current: T, next: T): void
  undo(current: T): T | null
  redo(current: T): T | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

export interface RetainedSnapshot<T> {
  bytes: number
  restore(current: T): T
}

const DEFAULT_BYTE_BUDGET = 16_000_000

export function createHistory<T>(options: {
  sizeOf: (snapshot: T) => number
  byteBudget?: number
  retain?: (snapshot: T, current: T) => RetainedSnapshot<T>
}): HistoryApi<T> {
  const budget = options.byteBudget ?? DEFAULT_BYTE_BUDGET
  // Cada passo guarda os bytes medidos UMA vez: o orçamento é um total corrente.
  const past: RetainedSnapshot<T>[] = []
  const future: RetainedSnapshot<T>[] = []
  let total = 0

  function trimToBudget(): void {
    // Mantém pelo menos 1 passo mesmo que um snapshot sozinho estoure o
    // orçamento — desfazer uma vez sempre funciona.
    while (total > budget && past.length + future.length > 1) {
      // Drop the farthest entry, never create a hole in either chain of deltas.
      const dropped = (past.length >= future.length ? past : future).shift()
      if (dropped !== undefined) total -= dropped.bytes
    }
  }

  function retain(snapshot: T, current?: T): RetainedSnapshot<T> {
    return options.retain && current !== undefined
      ? options.retain(snapshot, current)
      : { bytes: options.sizeOf(snapshot), restore: () => snapshot }
  }

  function push(stack: RetainedSnapshot<T>[], entry: RetainedSnapshot<T>): void {
    stack.push(entry)
    total += entry.bytes
  }

  return {
    record(snapshot, current) {
      // Um gesto novo invalida o redo (padrão universal de editores).
      for (const entry of future) total -= entry.bytes
      future.length = 0
      push(past, retain(snapshot, current))
      trimToBudget()
    },
    amend(current, next) {
      const entry = past.pop()
      if (!entry) return
      total -= entry.bytes
      push(past, retain(entry.restore(current), next))
      for (const pending of future) total -= pending.bytes
      future.length = 0
      trimToBudget()
    },
    undo(current) {
      const prev = past.pop()
      if (prev === undefined) return null
      total -= prev.bytes
      const restored = prev.restore(current)
      push(future, retain(current, restored))
      trimToBudget()
      return restored
    },
    redo(current) {
      const next = future.pop()
      if (next === undefined) return null
      total -= next.bytes
      const restored = next.restore(current)
      push(past, retain(current, restored))
      trimToBudget()
      return restored
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past.length = 0
      future.length = 0
      total = 0
    },
  }
}

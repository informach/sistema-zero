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

/** Um pedaço grande do snapshot que vários passos podem dividir (o MESMO objeto na memória). */
export interface SharedPart {
  key: object
  bytes: number
}

export function createHistory<T>(options: {
  /** Bytes do snapshot que são só dele. Com `sharedOf`, NÃO inclua as partes divididas. */
  sizeOf: (snapshot: T) => number
  /**
   * Partes que os snapshots dividem por referência (as células de uma camada do mapa que o
   * gesto não tocou). Cada uma conta UMA vez no orçamento enquanto algum passo a segura: é o
   * que a memória gasta de verdade. Sem isto, um mapa de 16 camadas custava 16 camadas por
   * pincelada e o desfazer encolhia para dois ou três passos.
   */
  sharedOf?: (snapshot: T) => Iterable<SharedPart>
  byteBudget?: number
}): HistoryApi<T> {
  const budget = options.byteBudget ?? DEFAULT_BYTE_BUDGET
  // Cada passo guarda os bytes medidos UMA vez: o orçamento é um total corrente, não um
  // `reduce` sobre a pilha inteira a cada pincelada (com sprites pequenos a pilha chega a
  // centenas de passos, e `sizeOf` de um vetor percorre até 500 formas por snapshot).
  const past: Array<{ snapshot: T; bytes: number; shared: SharedPart[] }> = []
  const future: T[] = []
  let total = 0
  const held = new Map<object, number>()

  function hold(parts: SharedPart[]): void {
    for (const part of parts) {
      const count = held.get(part.key) ?? 0
      if (count === 0) total += part.bytes
      held.set(part.key, count + 1)
    }
  }

  function release(parts: SharedPart[]): void {
    for (const part of parts) {
      const count = held.get(part.key) ?? 0
      if (count <= 1) {
        held.delete(part.key)
        if (count === 1) total -= part.bytes
      } else held.set(part.key, count - 1)
    }
  }

  function trimToBudget(): void {
    // Mantém pelo menos 1 passo mesmo que um snapshot sozinho estoure o
    // orçamento — desfazer uma vez sempre funciona.
    while (total > budget && past.length > 1) {
      const dropped = past.shift()
      if (dropped !== undefined) {
        total -= dropped.bytes
        release(dropped.shared)
      }
    }
  }

  function push(snapshot: T): void {
    const bytes = options.sizeOf(snapshot)
    // Uma parte repetida DENTRO do mesmo snapshot conta uma vez só.
    const shared = options.sharedOf
      ? [...new Map([...options.sharedOf(snapshot)].map((part) => [part.key, part])).values()]
      : []
    past.push({ snapshot, bytes, shared })
    total += bytes
    hold(shared)
  }

  return {
    record(snapshot) {
      push(snapshot)
      // Um gesto novo invalida o redo (padrão universal de editores).
      future.length = 0
      trimToBudget()
    },
    undo(current) {
      const prev = past.pop()
      if (prev === undefined) return null
      total -= prev.bytes
      release(prev.shared)
      future.push(current)
      return prev.snapshot
    },
    redo(current) {
      const next = future.pop()
      if (next === undefined) return null
      push(current)
      return next
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past.length = 0
      future.length = 0
      total = 0
      held.clear()
    },
  }
}

/** Bytes aproximados de um bitmap (payload dominante dos snapshots). */
export function bitmapBytes(bitmap: { data: Uint8Array }): number {
  return bitmap.data.byteLength + 64
}

export interface ReadTicket {
  kind: 'foreground' | 'background'
  generation: number
  id: number
  backgroundGeneration: number
}

export interface ForegroundPriority {
  beginForeground(): ReadTicket
  /** `null` enquanto qualquer leitura foreground estiver em voo. */
  beginBackground(): ReadTicket | null
  canPublish(ticket: ReadTicket): boolean
  finish(ticket: ReadTicket): void
  invalidate(): void
}

/**
 * Autoridade para telas com polling: foreground continua latest-wins, enquanto
 * background nunca invalida uma ação do operador. Um foreground novo invalida
 * qualquer polling já em voo.
 */
export function createForegroundPriority(): ForegroundPriority {
  let generation = 0
  let backgroundGeneration = 0
  let nextId = 0
  const foregroundInFlight = new Set<number>()
  return {
    beginForeground() {
      generation += 1
      const ticket: ReadTicket = {
        kind: 'foreground',
        generation,
        id: ++nextId,
        backgroundGeneration,
      }
      foregroundInFlight.add(ticket.id)
      return ticket
    },
    beginBackground() {
      if (foregroundInFlight.size > 0) return null
      backgroundGeneration += 1
      return {
        kind: 'background',
        generation,
        id: ++nextId,
        backgroundGeneration,
      }
    },
    canPublish(ticket) {
      if (ticket.generation !== generation) return false
      if (ticket.kind === 'foreground') return true
      return ticket.backgroundGeneration === backgroundGeneration && foregroundInFlight.size === 0
    },
    finish(ticket) {
      if (ticket.kind === 'foreground') foregroundInFlight.delete(ticket.id)
    },
    invalidate() {
      generation += 1
      backgroundGeneration += 1
      foregroundInFlight.clear()
    },
  }
}

/** Polling só substitui uma janela que ainda é exatamente a primeira página. */
export function canBackgroundRefreshPage(offset: number): boolean {
  return offset === 0
}

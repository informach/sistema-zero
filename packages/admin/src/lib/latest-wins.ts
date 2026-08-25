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

export interface LatestReadHandlers<T> {
  onSuccess(value: T): void
  onError(error: unknown): void
  onSettled(): void
}

export interface LatestAppendGuard {
  begin(): ReadTicket | null
  canPublish(ticket: ReadTicket): boolean
  finish(ticket: ReadTicket): void
  invalidate(): void
}

/** Single-flight para “Carregar mais”, com invalidação ao trocar a entidade dona da lista. */
export function createLatestAppendGuard(): LatestAppendGuard {
  const authority = createForegroundPriority()
  let active: ReadTicket | null = null
  return {
    begin() {
      if (active) return null
      active = authority.beginForeground()
      return active
    },
    canPublish(ticket) {
      return authority.canPublish(ticket)
    },
    finish(ticket) {
      authority.finish(ticket)
      if (active?.id === ticket.id) active = null
    },
    invalidate() {
      authority.invalidate()
      active = null
    },
  }
}

/** Executa uma leitura foreground e só publica o resultado se ela ainda for a mais recente. */
export async function runLatestForeground<T>(
  authority: ForegroundPriority,
  read: () => Promise<T>,
  handlers: LatestReadHandlers<T>,
): Promise<void> {
  const ticket = authority.beginForeground()
  try {
    const value = await read()
    if (authority.canPublish(ticket)) handlers.onSuccess(value)
  } catch (error) {
    if (authority.canPublish(ticket)) handlers.onError(error)
  } finally {
    const canPublish = authority.canPublish(ticket)
    authority.finish(ticket)
    if (canPublish) handlers.onSettled()
  }
}

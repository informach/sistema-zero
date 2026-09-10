export interface GestureToken<T> {
  readonly before: T
}

export interface GesturePorts<T> {
  current(): T
  revision(): number
  preview(next: T): void
  /** A restored preview may need to undo a write already completed during the gesture. */
  cancel?(before: T): void
  commit(before: T, after: T): void
}

/** A gesture owns one revision chain; late results never overwrite unrelated edits. */
export function createGestureCoordinator<T>(ports: GesturePorts<T>) {
  let active: { token: GestureToken<T>; revision: number; publication: { next: T } | null } | null =
    null

  function owns(token: GestureToken<T>): boolean {
    if (!active || active.token !== token) return false
    if (
      active.publication
        ? Object.is(ports.current(), active.publication.next)
        : ports.revision() === active.revision
    )
      return true
    active = null
    return false
  }

  function commit(token: GestureToken<T>, next = ports.current()): boolean {
    if (!owns(token)) return false
    active = null
    if (next !== token.before) ports.commit(token.before, next)
    return true
  }

  return {
    begin(): GestureToken<T> {
      if (active) commit(active.token)
      const token = { before: ports.current() }
      active = { token, revision: ports.revision(), publication: null }
      return token
    },
    preview(token: GestureToken<T>, next: T): boolean {
      if (!owns(token)) return false
      const owner = active!
      // Subscribers can distinguish our own publication from a nested external write.
      owner.publication = { next }
      try {
        ports.preview(next)
      } catch (error) {
        if (active === owner) active = null
        throw error
      }
      // A subscriber may cancel, begin another gesture, or publish another document.
      // Never resurrect the old owner after returning from that callback.
      if (active !== owner) return false
      if (!Object.is(ports.current(), next)) {
        active = null
        return false
      }
      owner.publication = null
      owner.revision = ports.revision()
      return true
    },
    isCurrent: owns,
    commit,
    cancel(token: GestureToken<T>): boolean {
      if (!owns(token)) return false
      active = null
      if (ports.current() !== token.before) {
        if (ports.cancel) ports.cancel(token.before)
        else ports.preview(token.before)
      }
      return true
    },
  }
}

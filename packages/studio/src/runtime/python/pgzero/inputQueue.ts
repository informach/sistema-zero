import { PGZERO_KEY_CODES, PGZERO_LETTER_BASE } from './keyCodes.generated'
import { PGZERO_LIMITS, type PgzeroInputEvent } from './protocol'

/** The parts of a KeyboardEvent the game reads. */
export interface PgzeroKeyboardEvent {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
}

/**
 * The pygame key of a browser key, and whether the page should keep the key for itself.
 * Every key is reported, Ctrl and the system key included (classic games fire with Ctrl), and
 * combinations keep their modifier like on the desktop. With Ctrl or the system key held the
 * browser still gets the key, so its shortcuts (reload, close, copy) keep working.
 */
export function readPgzeroKey(event: PgzeroKeyboardEvent) {
  // Letters follow the layout, like pygame; everything else by physical key.
  const key =
    /^[a-z]$/i.test(event.key) && event.code.startsWith('Key')
      ? PGZERO_LETTER_BASE + event.key.toLowerCase().charCodeAt(0) - 97
      : PGZERO_KEY_CODES[event.code]
  return {
    key,
    preventDefault: key !== undefined && event.key !== 'Tab' && !event.ctrlKey && !event.metaKey,
  }
}

const isRelease = (event: PgzeroInputEvent) => event[0] === 'ku' || event[0] === 'mu'
const isPress = (event: PgzeroInputEvent) => event[0] === 'kd' || event[0] === 'md'
/** The key (kd/ku) or mouse button (md/mu) an event is about. */
const subject = (event: PgzeroInputEvent) => (event[0][0] === 'k' ? event[1] : event[3])

/**
 * Input waiting for the next game frame. A press that reaches Python always gets its release:
 * releases are never dropped, a key is released by the physical key that pressed it (the
 * layout may change between the two), and losing focus releases every held key with a key-up,
 * as SDL does on the desktop.
 */
export function createPgzeroInputQueue(limit: number = PGZERO_LIMITS.events) {
  const events: PgzeroInputEvent[] = []
  /** Physical key (KeyboardEvent.code) → the pygame key code its key-down reported. */
  const keys = new Map<string, number>()
  const buttons = new Set<number>()

  /** Room for one more event; false when only a press could be dropped and this is a press. */
  function makeRoom(release: boolean) {
    if (events.length < limit) return true
    const motion = events.findIndex((item) => item[0] === 'mm')
    if (motion >= 0) {
      events.splice(motion, 1)
      return true
    }
    if (!release) return false
    // Drop the oldest complete press and release, so nothing stays held.
    for (let at = 0; at < events.length; at++) {
      const press = events[at]!
      if (!isPress(press)) continue
      const kind = press[0] === 'kd' ? 'ku' : 'mu'
      const after = events.findIndex(
        (item, index) => index > at && item[0] === kind && subject(item) === subject(press),
      )
      if (after < 0) continue
      events.splice(after, 1)
      events.splice(at, 1)
      return true
    }
    // Only releases are waiting: they are bounded by the presses that reached Python.
    return true
  }
  function push(event: PgzeroInputEvent) {
    if (!makeRoom(isRelease(event))) return false
    events.push(event)
    return true
  }

  return {
    keyDown(code: string, key: number, mod: number, unicode: string, repeat: boolean) {
      if (repeat || keys.has(code) || [...keys.values()].includes(key)) return
      if (push(['kd', key, mod, unicode])) keys.set(code, key)
    },
    keyUp(code: string, mod: number) {
      const key = keys.get(code)
      if (key === undefined) return
      keys.delete(code)
      push(['ku', key, mod])
    },
    /** Focus left the game: every held key is released, in order, after what is queued. */
    releaseKeys() {
      for (const key of keys.values()) push(['ku', key, 0])
      keys.clear()
    },
    buttonDown(x: number, y: number, button: number) {
      if (buttons.has(button)) return
      if (push(['md', x, y, button])) buttons.add(button)
    },
    buttonUp(x: number, y: number, button: number) {
      if (!buttons.delete(button)) return
      push(['mu', x, y, button])
    },
    /** A wheel step: pygame reports it as a press and release of button 4 or 5. */
    wheel(x: number, y: number, button: 4 | 5) {
      if (push(['md', x, y, button])) push(['mu', x, y, button])
    },
    motion(x: number, y: number, dx: number, dy: number, mask: number) {
      const last = events.at(-1)
      if (last?.[0] === 'mm') {
        // Merge motion: keep the latest position, add up the relative movement.
        events[events.length - 1] = ['mm', x, y, last[3] + dx, last[4] + dy, mask]
        return
      }
      push(['mm', x, y, dx, dy, mask])
    },
    take() {
      return events.splice(0)
    },
    clear() {
      events.length = 0
      keys.clear()
      buttons.clear()
    },
  }
}

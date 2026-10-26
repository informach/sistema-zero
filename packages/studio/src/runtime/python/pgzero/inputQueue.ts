import { PGZERO_KEY_CODES, PGZERO_KEY_MODS, PGZERO_LETTER_BASE } from './keyCodes.generated'
import { PGZERO_LIMITS, type PgzeroInputEvent } from './protocol'

/** The parts of a KeyboardEvent the game reads. */
export interface PgzeroKeyboardEvent {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
}

/** Modifier keys: their key-up arrives even while ⌘ is held, and alone they do nothing. */
const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
])
/**
 * Keys that make browser shortcuts with Ctrl or the system key (reload, close, copy, zoom, tabs,
 * history). Everything else is the game's even with them held: Ctrl+arrows or Ctrl+Space must
 * not scroll the page under a game that fires with Ctrl.
 */
const SHORTCUT_CODES =
  /^(Key[A-Z]|Digit\d|F\d{1,2}|Tab|Minus|Equal|BracketLeft|BracketRight|Comma|Period|Backquote|Numpad(Add|Subtract|0))$/

/**
 * The pygame key of a browser key, and whether the page should keep the key for itself.
 * Every key is reported, Ctrl and the system key included (classic games fire with Ctrl), and
 * combinations keep their modifier like on the desktop. With Ctrl or the system key held the
 * browser still gets its shortcut keys, so reload, close and copy keep working.
 */
export function readPgzeroKey(event: PgzeroKeyboardEvent) {
  // Letters follow the layout, like pygame; everything else by physical key.
  const key =
    /^[a-z]$/i.test(event.key) && event.code.startsWith('Key')
      ? PGZERO_LETTER_BASE + event.key.toLowerCase().charCodeAt(0) - 97
      : PGZERO_KEY_CODES[event.code]
  const shortcut =
    (event.ctrlKey || event.metaKey) &&
    (SHORTCUT_CODES.test(event.code) || MODIFIER_CODES.has(event.code))
  return { key, preventDefault: key !== undefined && event.key !== 'Tab' && !shortcut }
}

/** The pygame mouse buttons in a pygame button mask (left 1, middle 2, right 4). */
const MASK_BUTTONS = [
  [1, 1],
  [2, 2],
  [4, 3],
] as const

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
      // macOS never sends the key-up of a key pressed with ⌘ held: the key would stay down
      // and every later press of it would be ignored. Such a press is a press and a release.
      if (mod & PGZERO_KEY_MODS.meta && !MODIFIER_CODES.has(code)) {
        if (push(['kd', key, mod, unicode])) push(['ku', key, mod])
        return
      }
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
    /**
     * The buttons held now, as a pygame mask. A second button pressed (or one of two released)
     * reaches the page only as a pointer move with new buttons, never as a press or release:
     * every pointer event brings the held buttons up to date.
     */
    syncButtons(x: number, y: number, mask: number) {
      for (const [bit, button] of MASK_BUTTONS)
        if (!(mask & bit) && buttons.has(button)) this.buttonUp(x, y, button)
      for (const [bit, button] of MASK_BUTTONS)
        if (mask & bit && !buttons.has(button)) this.buttonDown(x, y, button)
    },
    /** The pointer was taken away (cancelled, capture lost, focus lost): release every button. */
    releaseButtons(x: number, y: number) {
      this.syncButtons(x, y, 0)
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

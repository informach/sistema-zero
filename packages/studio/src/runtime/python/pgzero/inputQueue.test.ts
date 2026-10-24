import { describe, expect, test } from 'bun:test'
import { createPgzeroInputQueue, readPgzeroKey } from './inputQueue'
import { PGZERO_KEY_CODES, PGZERO_KEY_MODS } from './keyCodes.generated'

const K_a = 97
const K_q = 113
const LCTRL = PGZERO_KEY_CODES.ControlLeft!
const LEFT = PGZERO_KEY_CODES.ArrowLeft!
const key = (code: string, value: string, modifiers: { ctrl?: boolean; meta?: boolean } = {}) => ({
  code,
  key: value,
  ctrlKey: !!modifiers.ctrl,
  metaKey: !!modifiers.meta,
})

describe('reading a key', () => {
  test('Ctrl and the system key are reported, and so are the keys pressed with them', () => {
    expect(readPgzeroKey(key('ControlLeft', 'Control', { ctrl: true })).key).toBe(LCTRL)
    expect(readPgzeroKey(key('MetaLeft', 'Meta', { meta: true })).key).toBe(
      PGZERO_KEY_CODES.MetaLeft,
    )
    expect(readPgzeroKey(key('ArrowLeft', 'ArrowLeft', { ctrl: true })).key).toBe(LEFT)
  })

  test('browser shortcuts keep working: a key with Ctrl or the system key is not held back', () => {
    expect(readPgzeroKey(key('KeyR', 'r', { ctrl: true })).preventDefault).toBe(false)
    expect(readPgzeroKey(key('KeyW', 'w', { meta: true })).preventDefault).toBe(false)
    expect(readPgzeroKey(key('ArrowLeft', 'ArrowLeft')).preventDefault).toBe(true)
    expect(readPgzeroKey(key('Tab', 'Tab')).preventDefault).toBe(false)
  })

  test('with Ctrl or the system key held, only shortcut keys go to the browser', () => {
    for (const code of ['KeyC', 'Digit1', 'F5', 'Minus', 'Equal', 'BracketLeft', 'Tab'])
      for (const modifiers of [{ ctrl: true }, { meta: true }])
        expect(readPgzeroKey(key(code, code, modifiers)).preventDefault).toBe(false)
    expect(readPgzeroKey(key('ControlLeft', 'Control', { ctrl: true })).preventDefault).toBe(false)
    // A game that fires with Ctrl keeps its arrows and space: the page must not scroll.
    for (const [code, value] of [
      ['ArrowLeft', 'ArrowLeft'],
      ['ArrowDown', 'ArrowDown'],
      ['Space', ' '],
      ['PageDown', 'PageDown'],
    ] as const)
      for (const modifiers of [{ ctrl: true }, { meta: true }])
        expect(readPgzeroKey(key(code, value, modifiers)).preventDefault).toBe(true)
  })

  test('letters follow the keyboard layout', () => {
    expect(readPgzeroKey(key('KeyQ', 'a')).key).toBe(K_a)
    expect(readPgzeroKey(key('KeyQ', 'q')).key).toBe(K_q)
  })
})

describe('the input queue', () => {
  test('a key is released by the physical key that pressed it, even if the layout changed', () => {
    const queue = createPgzeroInputQueue()
    // AZERTY: the Q key types "a"; released with Alt held it reads as another character.
    queue.keyDown('KeyQ', K_a, 0, 'a', false)
    queue.keyUp('KeyQ', 0)
    expect(queue.take()).toEqual([
      ['kd', K_a, 0, 'a'],
      ['ku', K_a, 0],
    ])
    // The key can be pressed again.
    queue.keyDown('KeyQ', K_a, 0, 'a', false)
    expect(queue.take()).toEqual([['kd', K_a, 0, 'a']])
  })

  test('losing focus releases every held key with a key-up, after what was queued', () => {
    const queue = createPgzeroInputQueue()
    queue.keyDown('ArrowLeft', LEFT, 0, '', false)
    queue.keyDown('KeyQ', K_q, 0, 'q', false)
    queue.releaseKeys()
    expect(queue.take()).toEqual([
      ['kd', LEFT, 0, ''],
      ['kd', K_q, 0, 'q'],
      ['ku', LEFT, 0],
      ['ku', K_q, 0],
    ])
    // A late key-up from the browser is not repeated.
    queue.keyUp('ArrowLeft', 0)
    expect(queue.take()).toEqual([])
  })

  test('a full queue never drops a release', () => {
    const queue = createPgzeroInputQueue(4)
    queue.keyDown('ArrowLeft', LEFT, 0, '', false)
    queue.buttonDown(1, 1, 1)
    queue.buttonUp(1, 1, 1)
    queue.buttonDown(2, 2, 1)
    // Full: a press is refused, so its release is not sent either.
    queue.keyDown('KeyQ', K_q, 0, 'q', false)
    queue.keyUp('KeyQ', 0)
    // A release always gets in, making room by dropping an old press with its release.
    queue.keyUp('ArrowLeft', 0)
    const events = queue.take()
    expect(events).toContainEqual(['ku', LEFT, 0])
    expect(events).toContainEqual(['kd', LEFT, 0, ''])
    expect(events.some((item) => item[1] === K_q)).toBe(false)
    // Every press that got in has its release (or is still held: the mouse button 1).
    expect(events.filter((item) => item[0] === 'kd').length).toBe(
      events.filter((item) => item[0] === 'ku').length,
    )
  })

  test('motion is merged and is the first thing dropped when the queue is full', () => {
    const queue = createPgzeroInputQueue(2)
    queue.motion(1, 1, 1, 1, 0)
    queue.motion(3, 4, 2, 3, 0)
    queue.keyDown('ArrowLeft', LEFT, 0, '', false)
    queue.keyUp('ArrowLeft', 0)
    expect(queue.take()).toEqual([
      ['kd', LEFT, 0, ''],
      ['ku', LEFT, 0],
    ])
  })

  test('key repeat and a second physical key with the same code are ignored', () => {
    const queue = createPgzeroInputQueue()
    queue.keyDown('ArrowLeft', LEFT, 0, '', false)
    queue.keyDown('ArrowLeft', LEFT, 0, '', true)
    queue.keyDown('ArrowLeft', LEFT, 0, '', false)
    expect(queue.take()).toEqual([['kd', LEFT, 0, '']])
  })

  test('a key pressed with the system key held is a press and a release (macOS sends no key-up)', () => {
    const queue = createPgzeroInputQueue()
    const S = 115
    const META = PGZERO_KEY_CODES.MetaLeft!
    const mod = PGZERO_KEY_MODS.meta
    queue.keyDown('MetaLeft', META, mod, '', false)
    queue.keyDown('KeyS', S, mod, 's', false)
    // No key-up for S ever arrives; then the system key is released.
    queue.keyUp('MetaLeft', 0)
    queue.keyDown('KeyS', S, 0, 's', false)
    queue.keyUp('KeyS', 0)
    expect(queue.take()).toEqual([
      ['kd', META, mod, ''],
      ['kd', S, mod, 's'],
      ['ku', S, mod],
      ['ku', META, 0],
      ['kd', S, 0, 's'],
      ['ku', S, 0],
    ])
  })
})

describe('mouse buttons', () => {
  test('a second button pressed and the first released while it is held leave nothing down', () => {
    const queue = createPgzeroInputQueue()
    // E down, D down, E up, D up: the browser sends pointerdown, two pointer moves, pointerup.
    queue.syncButtons(5, 5, 1)
    queue.syncButtons(5, 5, 1 | 4)
    queue.syncButtons(6, 5, 4)
    queue.syncButtons(6, 5, 0)
    expect(queue.take()).toEqual([
      ['md', 5, 5, 1],
      ['md', 5, 5, 3],
      ['mu', 6, 5, 1],
      ['mu', 6, 5, 3],
    ])
    // Both can be pressed again.
    queue.syncButtons(1, 1, 1 | 2)
    expect(queue.take()).toEqual([
      ['md', 1, 1, 1],
      ['md', 1, 1, 2],
    ])
  })

  test('a cancelled pointer releases every held button', () => {
    const queue = createPgzeroInputQueue()
    queue.syncButtons(2, 3, 1 | 4)
    queue.take()
    queue.releaseButtons(2, 3)
    expect(queue.take()).toEqual([
      ['mu', 2, 3, 1],
      ['mu', 2, 3, 3],
    ])
    queue.releaseButtons(2, 3)
    expect(queue.take()).toEqual([])
  })
})

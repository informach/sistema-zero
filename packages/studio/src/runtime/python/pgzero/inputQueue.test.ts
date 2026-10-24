import { describe, expect, test } from 'bun:test'
import { createPgzeroInputQueue, readPgzeroKey } from './inputQueue'
import { PGZERO_KEY_CODES } from './keyCodes.generated'

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
})

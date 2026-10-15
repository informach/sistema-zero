import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import { buildProHostBridgeScript } from '../../core/src/studio/pro-runtime-bridge'

test('Pro host bridge authenticates controls/audio, bounds keys and releases held keys', () => {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>()
  const events: Record<string, unknown>[] = [],
    replies: unknown[] = []
  const parent = { postMessage: (...args: unknown[]) => replies.push(args) }
  const window = {
    parent,
    addEventListener: (type: string, fn: (event: Record<string, unknown>) => void) =>
      handlers.set(type, fn),
    dispatchEvent: (event: Record<string, unknown>) => {
      events.push(event)
      return true
    },
  }
  class Event {
    constructor(
      readonly type: string,
      options: Record<string, unknown>,
    ) {
      Object.assign(this, options)
    }
  }
  runInNewContext(buildProHostBridgeScript('https://kids.test'), {
    window,
    document: { addEventListener() {} },
    KeyboardEvent: Event,
    CustomEvent: Event,
  })
  const fire = (data: unknown, origin = 'https://kids.test', source: unknown = parent) =>
    handlers.get('message')!({ data, origin, source })
  const key = { type: 'sz:gamepad', action: 'keydown', key: 'ArrowRight', code: 'ArrowRight' }
  fire(key, 'https://evil.test')
  fire(key, 'https://kids.test', {})
  fire({ ...key, code: '<script>' })
  fire({ ...key, key: 'x'.repeat(25) })
  expect(events).toHaveLength(0)
  fire(key)
  fire(key)
  expect(events.map((event) => event.repeat)).toEqual([false, true])
  handlers.get('blur')!({})
  expect(events.at(-1)).toMatchObject({ type: 'keyup', code: 'ArrowRight' })
  fire({ type: 'sz:audio', muted: 'true' })
  expect(events).toHaveLength(3)
  fire({ type: 'sz:audio', muted: true })
  expect(events.at(-1)).toMatchObject({ type: 'studio:host-audio', detail: { muted: true } })
  expect((window as typeof window & { szStudioHost: { muted: boolean } }).szStudioHost.muted).toBe(
    true,
  )
  fire({ type: 'sz:stage?' })
  expect(replies).toEqual([
    [{ type: 'sz:stage', w: 0, h: 0, responsive: true }, 'https://kids.test'],
  ])
})

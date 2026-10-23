import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { installPythonPlayerBridge } from './playerBridge'

afterEach(() => mock.restore())
function setup() {
  const scope = new AbortController()
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const messages: unknown[] = []
  spyOn(window, 'postMessage').mockImplementation((value, origin) => {
    messages.push({ value, origin })
  })
  let captures = 0
  let capture = async () => ({
    dataUrl: 'data:image/png;base64,YQ==',
    width: 800,
    height: 600,
    frameSequence: 1,
  })
  installPythonPlayerBridge({
    parent: window,
    origin: 'https://kids.test',
    signal: scope.signal,
    canvas: () => canvas,
    capture: async () => {
      captures++
      return capture()
    },
  })
  const send = (data: unknown, origin = 'https://kids.test', source: Window | null = window) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }))
  return {
    scope,
    canvas,
    messages,
    send,
    captures: () => captures,
    capture: (handler: typeof capture) => {
      capture = handler
    },
  }
}

test('Python stage/gamepad bridge accepts only the established parent and origin, preserving exact dimensions and keys', () => {
  const f = setup()
  const keys: string[] = []
  f.canvas.addEventListener('keydown', (event) => {
    keys.push(`${event.key}:${event.code}`)
  })
  f.send({ type: 'sz:stage?' }, 'https://attacker.test')
  f.send(
    { type: 'sz:gamepad', action: 'keydown', key: 'ArrowUp', code: 'ArrowUp' },
    'https://kids.test',
    null,
  )
  expect(f.messages).toEqual([])
  expect(keys).toEqual([])
  f.send({ type: 'sz:stage?' })
  f.send({ type: 'sz:gamepad', action: 'keydown', key: 'ArrowUp', code: 'ArrowUp' })
  expect(f.messages).toEqual([
    { value: { type: 'sz:stage', w: 800, h: 600 }, origin: 'https://kids.test' },
  ])
  expect(keys).toEqual(['ArrowUp:ArrowUp'])
  for (const changes of [
    { action: 'execute' },
    { key: 'x'.repeat(81) },
    { code: {} },
    { source: 'print(42)', type: 'run' },
  ])
    f.send({ type: 'sz:gamepad', action: 'keydown', key: 'a', code: 'KeyA', ...changes })
  expect(keys).toHaveLength(1)
  f.scope.abort()
  f.send({ type: 'sz:stage?' })
  expect(f.messages).toHaveLength(1)
})

test('Python screenshot is single-flight and does not reply after the frame generation closes', async () => {
  const f = setup()
  let release!: (value: {
    dataUrl: string
    width: number
    height: number
    frameSequence: number
  }) => void
  f.capture(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  f.send({ type: 'sz:screenshot' })
  f.send({ type: 'sz:screenshot' })
  expect(f.captures()).toBe(1)
  f.scope.abort()
  release({ dataUrl: 'data:image/png;base64,YQ==', width: 800, height: 600, frameSequence: 1 })
  await Promise.resolve()
  await Promise.resolve()
  expect(f.messages).toEqual([])
})

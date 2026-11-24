import { describe, expect, it } from 'bun:test'
import { buildInterceptorScript } from '../interceptors'

interface CapturedMessage {
  kind: string
  parts: string[]
  error?: { message?: string; userCode?: boolean; line?: number }
}

/**
 * Roda o script do interceptador (string auto-contida) num escopo controlado,
 * injetando um `parent` mock e um `console` falso, para capturar o que seria
 * enviado ao parent via postMessage. `window`/`document`/`Node` são os reais do
 * jsdom. `setInterval` é um no-op injetado (o heartbeat periódico não deve
 * vazar timers no teste); o heartbeat imediato é filtrado de `captured` por ser
 * infraestrutura, não log.
 */
function runInterceptor(): {
  console: Console
  captured: CapturedMessage[]
  win: Window & typeof globalThis
  flushNotices: () => void
  nativeCalls: () => number
  advanceClock: (milliseconds: number) => void
} {
  const captured: CapturedMessage[] = []
  const parent = {
    postMessage: (msg: CapturedMessage) => {
      if (msg.kind !== 'heartbeat') captured.push(msg)
    },
  }
  let nativeCalls = 0
  const native = () => {
    nativeCalls++
  }
  const fakeConsole = {
    log: native,
    warn: native,
    error: native,
    info: native,
  } as unknown as Console
  const notices: Array<() => void> = []
  let clock = 0
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(
    'parent',
    'window',
    'document',
    'Node',
    'console',
    'setInterval',
    'setTimeout',
    'Date',
    buildInterceptorScript('*'),
  )
  run(
    parent,
    window,
    document,
    Node,
    fakeConsole,
    () => 0,
    (callback: () => void) => {
      notices.push(callback)
      return notices.length
    },
    { now: () => clock },
  )
  return {
    console: fakeConsole,
    captured,
    win: window as Window & typeof globalThis,
    flushNotices: () => {
      for (const callback of notices.splice(0)) callback()
    },
    nativeCalls: () => nativeCalls,
    advanceClock: (milliseconds) => {
      clock += milliseconds
    },
  }
}

it('bounds console traffic before IPC and native DevTools, reports omissions and keeps runtime errors', () => {
  const f = runInterceptor()
  for (let i = 0; i < 10_000; i++) f.console.log('message', i)
  expect(f.captured.length).toBeLessThanOrEqual(180)
  expect(f.nativeCalls()).toBeLessThanOrEqual(180)
  f.flushNotices()
  expect(f.captured.at(-1)?.kind).toBe('warn')
  expect(f.captured.at(-1)?.parts.join(' ')).toContain('9821')
  f.win.onerror?.(
    'real failure after flood',
    undefined,
    7,
    2,
    new Error('real failure after flood'),
  )
  expect(f.captured.at(-1)?.kind).toBe('runtimeError')
  expect(f.captured.at(-1)?.parts.join(' ')).toContain('real failure')
  f.advanceClock(1000)
  f.console.log('next interval')
  expect(f.captured.at(-1)?.kind).toBe('log')
  expect(f.captured.at(-1)?.parts).toEqual(['next interval'])
})

describe('interceptor console.log — serialização de valores', () => {
  it('mostra a tag de abertura ao logar um elemento do DOM (não "{}")', () => {
    const { console, captured } = runInterceptor()
    const canvas = document.createElement('canvas')
    canvas.setAttribute('id', 'tela')
    canvas.setAttribute('width', '400')
    canvas.setAttribute('height', '300')

    console.log(canvas)

    expect(captured).toHaveLength(1)
    const part = captured[0]?.parts[0] ?? ''
    expect(part).toContain('<canvas')
    expect(part).toContain('id="tela"')
    expect(part).not.toBe('{}')
  })

  it('ainda serializa objetos simples como JSON', () => {
    const { console, captured } = runInterceptor()
    console.log({ a: 1, b: 'oi' })
    expect(captured[0]?.parts[0]).toBe('{"a":1,"b":"oi"}')
  })

  it('representa nós do DOM aninhados dentro de objetos', () => {
    const { console, captured } = runInterceptor()
    const div = document.createElement('div')
    div.setAttribute('class', 'card')
    console.log({ el: div })
    const part = captured[0]?.parts[0] ?? ''
    expect(part).toContain('<div')
    expect(part).toContain('card')
    expect(part).not.toContain('"el":{}')
  })
})

describe('interceptor — guarda de loop', () => {
  it('traduz erro marcado __szLoopGuard para kind "loopStopped"', () => {
    const { captured, win } = runInterceptor()
    const err = Object.assign(new Error('Laço preso por tempo demais'), { __szLoopGuard: true })
    win.onerror?.('Laço preso por tempo demais', undefined, 0, 0, err)
    const loop = captured.find((m) => m.kind === 'loopStopped')
    expect(loop).toBeDefined()
    expect(loop?.parts[0]).toContain('Laço preso')
  })

  it('erro comum continua como "runtimeError"', () => {
    const { captured, win } = runInterceptor()
    win.onerror?.('boom', undefined, 1, 1, new Error('boom'))
    expect(captured.some((m) => m.kind === 'runtimeError')).toBe(true)
    expect(captured.some((m) => m.kind === 'loopStopped')).toBe(false)
  })
})

describe('interceptor — origem do erro (userCode)', () => {
  it('marca userCode=true SÓ quando o src termina com a cauda semeada pelo buildPreviewDoc', () => {
    const { captured, win } = runInterceptor()
    const w = win as unknown as Record<string, unknown>
    w.__SZ_USER_JS_TAIL = 'AAAABBBB'
    try {
      win.onerror?.('boom', 'data:text/javascript;base64,xxxxAAAABBBB', 3, 7, new Error('boom'))
      win.onerror?.('boom', 'data:text/javascript;base64,zzzzzzzz', 1, 1, new Error('boom'))
      const errors = captured.filter((m) => m.kind === 'runtimeError')
      expect(errors[0]?.error?.userCode).toBe(true)
      expect(errors[0]?.error?.line).toBe(3)
      expect(errors[1]?.error?.userCode).toBe(false)
    } finally {
      delete w.__SZ_USER_JS_TAIL
    }
  })
})

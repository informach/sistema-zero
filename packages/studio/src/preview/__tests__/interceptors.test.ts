import { describe, expect, it } from 'bun:test'
import { buildInterceptorScript } from '../interceptors'

interface CapturedMessage {
  kind: string
  parts: string[]
  error?: { message?: string }
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
} {
  const captured: CapturedMessage[] = []
  const parent = {
    postMessage: (msg: CapturedMessage) => {
      if (msg.kind !== 'heartbeat') captured.push(msg)
    },
  }
  const fakeConsole = { log() {}, warn() {}, error() {}, info() {} } as unknown as Console
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(
    'parent',
    'window',
    'document',
    'Node',
    'console',
    'setInterval',
    buildInterceptorScript('*'),
  )
  run(parent, window, document, Node, fakeConsole, () => 0)
  return { console: fakeConsole, captured, win: window as Window & typeof globalThis }
}

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

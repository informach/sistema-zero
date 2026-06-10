import { describe, expect, it } from 'bun:test'
import { buildInterceptorScript } from '../interceptors'

interface CapturedMessage {
  kind: string
  parts: string[]
}

/**
 * Roda o script do interceptador (string auto-contida) num escopo controlado,
 * injetando um `parent` mock e um `console` falso, para capturar o que seria
 * enviado ao parent via postMessage. `window`/`document`/`Node` são os reais do
 * jsdom.
 */
function runInterceptor(): { console: Console; captured: CapturedMessage[] } {
  const captured: CapturedMessage[] = []
  const parent = { postMessage: (msg: CapturedMessage) => captured.push(msg) }
  const fakeConsole = { log() {}, warn() {}, error() {}, info() {} } as unknown as Console
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(
    'parent',
    'window',
    'document',
    'Node',
    'console',
    buildInterceptorScript('*'),
  )
  run(parent, window, document, Node, fakeConsole)
  return { console: fakeConsole, captured }
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

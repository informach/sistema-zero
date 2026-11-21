import { describe, expect, it } from 'bun:test'
import { buildProHostBridgeScript } from '../src/studio/pro-runtime-bridge'

/**
 * A ponte do Pro para as abas do Estúdio (proposta aprovada em 20/11/2026): a medida do
 * Desempenho e o erro do Investigar. O script é uma string que roda na página do jogo; aqui ele
 * roda sobre uma janela de mentira (o mesmo molde dos testes das pontes da prévia clássica).
 */

const HOST = 'https://studio.test'

function harness() {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const posted: { data: Record<string, unknown>; origin: string }[] = []
  const frames: ((time: number) => void)[] = []
  const timers: (() => void)[] = []
  let now = 0
  const parent = {
    postMessage: (data: Record<string, unknown>, origin: string) => posted.push({ data, origin }),
  }
  const native = (callback: (time: number) => void) => {
    frames.push(callback)
    return frames.length
  }
  const window: Record<string, unknown> = {
    parent,
    requestAnimationFrame: native,
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    dispatchEvent: () => true,
  }
  const document = {
    hidden: false,
    readyState: 'complete',
    addEventListener: () => {},
    querySelector: () => null,
  }
  const run = new Function(
    'window',
    'document',
    'performance',
    'setInterval',
    'clearInterval',
    'KeyboardEvent',
    'CustomEvent',
    'Object',
    buildProHostBridgeScript(HOST),
  )
  run(
    window,
    document,
    { now: () => now },
    (callback: () => void) => {
      timers.push(callback)
      return timers.length
    },
    (id: number) => {
      timers[id - 1] = () => {}
    },
    class {},
    class {},
    { defineProperty: () => {}, freeze: (value: unknown) => value },
  )
  const fire = (type: string, event: unknown) => {
    for (const listener of listeners.get(type) ?? []) listener(event)
  }
  return {
    window,
    native,
    posted,
    message: (data: unknown) => fire('message', { source: parent, origin: HOST, data }),
    fire,
    /** Um quadro do navegador: roda os pedidos de quadro feitos até aqui, no tempo dado. */
    frame(time: number) {
      now = time
      for (const callback of frames.splice(0)) callback(time)
    },
    tick(time: number) {
      now = time
      for (const timer of timers) timer()
    },
  }
}

describe('a ponte do Pro: a medida do Desempenho', () => {
  it('fica desligada até o Estúdio pedir, e conta os quadros do jogo enquanto mede', () => {
    const page = harness()
    expect(page.window.requestAnimationFrame).toBe(page.native)
    page.message({ type: 'sz:perf', on: true })
    expect(page.window.requestAnimationFrame).not.toBe(page.native)
    // O jogo pede um quadro a cada quadro (o laço de sempre), a 20 ms cada.
    const loop = () => (page.window.requestAnimationFrame as (cb: () => void) => void)(loop)
    loop()
    for (let time = 20; time <= 500; time += 20) page.frame(time)
    page.tick(500)
    const slice = page.posted.find((item) => item.data.type === 'sz:perf')
    expect(slice?.origin).toBe(HOST)
    expect(slice?.data.fps).toBeCloseTo(48, 0)
    expect(slice?.data.frameMsAvg).toBe(20)
    expect(slice?.data.canvas).toBe(true)
    page.message({ type: 'sz:perf', on: false })
    expect(page.window.requestAnimationFrame).toBe(page.native)
  })

  it('a página sem quadros diz que não tem quadros (sem desenho)', () => {
    const page = harness()
    page.message({ type: 'sz:perf', on: true })
    page.tick(500)
    expect(page.posted.at(-1)?.data).toMatchObject({ type: 'sz:perf', fps: 0, canvas: false })
  })

  it('só o Estúdio liga a medida (outra origem é ignorada)', () => {
    const page = harness()
    page.fire('message', {
      source: page.window.parent,
      origin: 'https://outro.test',
      data: { type: 'sz:perf', on: true },
    })
    expect(page.window.requestAnimationFrame).toBe(page.native)
  })
})

describe('a ponte do Pro: o erro do Investigar', () => {
  it('manda o erro com a pilha ao Estúdio, no máximo 20 por página', () => {
    const page = harness()
    const error = new Error('boom')
    error.stack = 'Error: boom\n    at mover (https://jogo.test/src/main.js:12:5)'
    page.fire('error', { message: 'Uncaught Error: boom', error })
    expect(page.posted.at(-1)).toEqual({
      data: { type: 'sz:pro-error', message: 'Uncaught Error: boom', stack: error.stack },
      origin: HOST,
    })
    page.fire('unhandledrejection', { reason: new Error('promessa') })
    expect(page.posted.at(-1)?.data).toMatchObject({ type: 'sz:pro-error', message: 'promessa' })
    for (let index = 0; index < 30; index++) page.fire('error', { message: 'de novo' })
    expect(page.posted.filter((item) => item.data.type === 'sz:pro-error')).toHaveLength(20)
  })
})

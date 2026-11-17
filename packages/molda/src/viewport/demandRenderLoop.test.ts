import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DemandRenderLoop } from './demandRenderLoop'

let originalRequest: typeof requestAnimationFrame
let originalCancel: typeof cancelAnimationFrame
let nextFrame = 1
let frames: Map<number, FrameRequestCallback>

beforeEach(() => {
  originalRequest = globalThis.requestAnimationFrame
  originalCancel = globalThis.cancelAnimationFrame
  nextFrame = 1
  frames = new Map()
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id)
  }
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRequest
  globalThis.cancelAnimationFrame = originalCancel
})

function fixture(renderFrame: () => boolean = () => false) {
  const parent = document.createElement('div')
  Object.defineProperties(parent, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
  })
  const canvas = document.createElement('canvas')
  parent.append(canvas)
  const sizes: Array<[number, number, boolean]> = []
  const camera = { aspect: 0, updates: 0, updateProjectionMatrix: () => camera.updates++ }
  const loop = new DemandRenderLoop(
    canvas,
    { setSize: (width, height, updateStyle) => sizes.push([width, height, updateStyle]) },
    camera,
    renderFrame,
  )
  return { loop, sizes, camera, canvas }
}

describe('DemandRenderLoop', () => {
  test('redimensionar não apaga o canvas fora do frame que o redesenha', () => {
    const original = globalThis.ResizeObserver
    let notificar = () => {}
    globalThis.ResizeObserver = class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        notificar = () => callback([], this)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const desenhados: Array<[number, number, boolean]> = []
    const { loop, canvas, sizes } = fixture(() => {
      const tamanho = sizes.at(-1)
      if (!tamanho) throw Error('O desenho começou sem dimensionar o framebuffer')
      desenhados.push(tamanho)
      return false
    })
    const avancar = () => {
      const callback = [...frames.values()][0]
      frames.clear()
      callback?.(0)
    }
    try {
      avancar()
      expect(desenhados).toEqual([[320, 180, false]])
      Object.defineProperty(canvas.parentElement!, 'clientWidth', {
        configurable: true,
        value: 640,
      })
      notificar()
      // setSize apaga o framebuffer. Deve ocorrer junto do próximo render, sem um paint vazio.
      expect(sizes).toEqual([[320, 180, false]])
      expect(desenhados).toHaveLength(1)
      avancar()
      expect(desenhados).toEqual([
        [320, 180, false],
        [640, 180, false],
      ])
      expect(sizes).toEqual(desenhados)
    } finally {
      loop.dispose()
      globalThis.ResizeObserver = original
    }
  })
  test('an offscreen canvas suspends requests until its observed intersection returns', () => {
    const original = globalThis.IntersectionObserver
    const observed: { observer?: IntersectionObserver; callback?: IntersectionObserverCallback } =
      {}
    let disconnected = false
    globalThis.IntersectionObserver = class implements IntersectionObserver {
      readonly root = null
      readonly rootMargin = '0px'
      readonly thresholds = [0]
      constructor(callback: IntersectionObserverCallback) {
        observed.callback = callback
        observed.observer = this
      }
      observe() {}
      unobserve() {}
      takeRecords() {
        return []
      }
      disconnect() {
        disconnected = true
      }
    }
    const { loop, canvas } = fixture()
    const notify = (isIntersecting: boolean) => {
      const rect = new DOMRectReadOnly(0, 0, 320, 180)
      observed.callback?.(
        [
          {
            target: canvas,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
            time: 0,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: rect,
          },
        ],
        observed.observer!,
      )
    }
    try {
      notify(false)
      loop.request()
      expect(frames.size).toBe(0)
      notify(true)
      expect(frames.size).toBe(1)
      loop.dispose()
      expect(disconnected).toBe(true)
      notify(true)
      expect(frames.size).toBe(0)
    } finally {
      loop.dispose()
      globalThis.IntersectionObserver = original
    }
  })
  test('hidden tabs suspend pending animation and coalesce changes until visible again', () => {
    const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    let hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    let renders = 0
    const { loop } = fixture(() => {
      renders += 1
      return false
    })
    try {
      hidden = true
      document.dispatchEvent(new Event('visibilitychange'))
      expect(frames.size).toBe(0)
      loop.request()
      loop.request()
      expect(frames.size).toBe(0)
      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
      expect(frames.size).toBe(1)
      const callback = [...frames.values()][0]
      frames.clear()
      callback?.(0)
      expect(renders).toBe(1)
      expect(frames.size).toBe(0)
    } finally {
      loop.dispose()
      if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
      else Reflect.deleteProperty(document, 'hidden')
    }
  })

  test('context loss suspends rendering and restores exactly one frame; dispose removes listeners', () => {
    const { loop, canvas } = fixture()
    canvas.dispatchEvent(new Event('webglcontextlost'))
    loop.request()
    expect(frames.size).toBe(0)
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(frames.size).toBe(1)
    loop.dispose()
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(frames.size).toBe(0)
  })
  test('dimensiona o palco e coalesce pedidos no mesmo frame', () => {
    let renders = 0
    const { loop, sizes, camera } = fixture(() => {
      renders += 1
      return false
    })

    loop.request()
    loop.request()

    expect(sizes).toEqual([])
    expect(camera.aspect).toBe(320 / 180)
    expect(camera.updates).toBe(1)
    expect(frames.size).toBe(1)
    const callback = [...frames.values()][0]
    frames.clear()
    callback?.(0)
    expect(renders).toBe(1)
    expect(sizes).toEqual([[320, 180, false]])
    expect(frames.size).toBe(0)
    loop.dispose()
  })

  test('continua durante o amortecimento e dispose cancela o próximo frame', () => {
    let renders = 0
    const { loop } = fixture(() => {
      renders += 1
      return true
    })
    const callback = [...frames.values()][0]
    frames.clear()

    callback?.(0)
    expect(renders).toBe(1)
    expect(frames.size).toBe(1)

    loop.dispose()
    expect(frames.size).toBe(0)
    loop.request()
    expect(frames.size).toBe(0)
  })
})

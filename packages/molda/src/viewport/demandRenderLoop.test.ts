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
    clientWidth: { value: 320 },
    clientHeight: { value: 180 },
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
  return { loop, sizes, camera }
}

describe('DemandRenderLoop', () => {
  test('dimensiona o palco e coalesce pedidos no mesmo frame', () => {
    let renders = 0
    const { loop, sizes, camera } = fixture(() => {
      renders += 1
      return false
    })

    loop.request()
    loop.request()

    expect(sizes).toEqual([[320, 180, false]])
    expect(camera.aspect).toBe(320 / 180)
    expect(camera.updates).toBe(1)
    expect(frames.size).toBe(1)
    const callback = [...frames.values()][0]
    frames.clear()
    callback?.(0)
    expect(renders).toBe(1)
    expect(frames.size).toBe(0)
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

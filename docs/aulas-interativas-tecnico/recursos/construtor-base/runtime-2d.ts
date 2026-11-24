/** Integration checks against the exact official 2D runtime and generated script.
 * DOM is happy-dom; drawing is real @napi-rs/canvas. This is not a browser smoke test.
 * Test hooks only expose local game state in the test copy of script.js.
 */

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { gameTwoDRuntimeSource } from '../../../../packages/studio/src/official-extensions/game-2d/runtime'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sharedRequire = createRequire(resolve(here, '../../../../packages/studio/package.json'))
const { Window } = (() => {
  try {
    return sharedRequire('happy-dom')
  } catch {
    // Bun pode isolar as dependências: o Estúdio declara o registrador, que
    // depende de happy-dom. Resolva pelo pacote real, sem presumir hoisting.
    return createRequire(sharedRequire.resolve('@happy-dom/global-registrator'))('happy-dom')
  }
})()
const dependency = (name) => {
  try {
    return require(name)
  } catch (error) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error
    return require(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, name))
  }
}
const { createCanvas, Image: NativeImage } = dependency('@napi-rs/canvas')
const sharp = dependency('sharp')
const captures = resolve(here, '../../../../tmp/construtor-runtime')
mkdirSync(captures, { recursive: true })

export async function boot(project, files) {
  // Native canvas has no browser SVG/data-URL loader. Decode the unchanged SVG
  // assets through librsvg only for this drawing adapter; .szproject keeps SVG.
  const decoded = new Map(
    await Promise.all(
      project.assets.map(async (a) => [
        a.dataUrl,
        await sharp(Buffer.from(a.dataUrl.split(',')[1], 'base64'))
          .png()
          .toBuffer(),
      ]),
    ),
  )
  class Image extends NativeImage {
    set src(url) {
      this._source = url
      super.src = decoded.get(url) || url
    }
    get src() {
      return this._source
    }
    addEventListener(type, callback) {
      const previous = this[`on${type}`]
      this[`on${type}`] = (...args) => {
        if (typeof previous === 'function') previous(...args)
        callback(...args)
      }
    }
    removeEventListener() {}
  }
  const window = new Window({ url: 'https://studio.test/' })
  const canvases = new WeakMap()
  const errors = [],
    warnings = []
  let now = 0,
    rafId = 0
  const rafs = new Map()
  const timers = new Map()
  window.console.error = (...xs) => errors.push(xs.map(String).join(' '))
  window.console.warn = (...xs) => warnings.push(xs.map(String).join(' '))
  Object.defineProperties(window, {
    innerWidth: { value: 800, configurable: true },
    innerHeight: { value: 480, configurable: true },
    devicePixelRatio: { value: 1, configurable: true },
    performance: { value: { now: () => now }, configurable: true },
    Image: { value: Image, configurable: true },
  })
  window.SZGameUIFont = { family: 'Noto Sans' }
  window.__SZGAME_ASSETS = Object.fromEntries(project.assets.map((a) => [a.name, a.dataUrl]))
  window.__SZSTUDIO_RUNTIME_INSPECTORS = {}
  const canvasProto = window.HTMLCanvasElement.prototype
  for (const axis of ['width', 'height']) {
    const original = Object.getOwnPropertyDescriptor(canvasProto, axis)
    Object.defineProperty(canvasProto, axis, {
      configurable: true,
      get() {
        return original.get.call(this)
      },
      set(v) {
        original.set.call(this, v)
        const backing = canvases.get(this)
        if (backing) backing[axis] = Number(v)
      },
    })
  }
  canvasProto.getContext = function (kind) {
    if (kind !== '2d') return null
    let canvas = canvases.get(this)
    if (!canvas) {
      canvas = createCanvas(this.width || 300, this.height || 150)
      canvases.set(this, canvas)
    }
    return canvas.getContext('2d')
  }
  const requestAnimationFrame = (callback) => {
    rafs.set(++rafId, callback)
    return rafId
  }
  const cancelAnimationFrame = (id) => rafs.delete(id)
  const setTimeout = (callback, delay) => {
    const id = ++rafId
    timers.set(id, { callback, when: now + delay })
    return id
  }
  const clearTimeout = (id) => timers.delete(id)
  Object.assign(window, { requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout })
  const context = vm.createContext({
    window,
    document: window.document,
    Image,
    AbortController: window.AbortController,
    AbortSignal: window.AbortSignal,
    URL,
    Blob,
    structuredClone,
    HTMLCanvasElement: window.HTMLCanvasElement,
    performance: window.performance,
    console: window.console,
    requestAnimationFrame,
    cancelAnimationFrame,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    WeakMap,
    WeakSet,
    Map,
    Set,
  })
  Object.defineProperty(context, 'ctx', { get: () => window.ctx, configurable: true })
  vm.runInContext(gameTwoDRuntimeSource, context, { filename: 'official-game-2d-runtime.js' })
  context.SZGame2D = window.SZGame2D
  const marker = '  SZGame2D.setScene("inicio");'
  // A sonda existe somente na cópia executada pelo QA; nunca no projeto entregue.
  const names = ['nave', 'tiros', 'asteroides', 'pontos', 'meta'].filter((name) =>
    new RegExp(`\\b(?:let|const|var)\\s+${name}\\b`).test(files['script.js']),
  )
  const members = names
    .map((name) => `get ${name}(){return ${name}}, set ${name}(v){${name}=v}`)
    .join(',')
  const hook = `window.__game = { ${members} };`
  assert(files['script.js'].includes(marker))
  const script = files['script.js'].replace(marker, `${marker}\n  ${hook}`)
  vm.runInContext(script, context, { filename: `${project.filename || project.name}/script.js` })
  const sleep = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms))
  await sleep(25)
  const api = window.SZGame2D
  const tick = (frames = 1) => {
    for (let frame = 0; frame < frames; frame++) {
      now += 1000 / 60
      const callbacks = [...rafs.values()]
      rafs.clear()
      for (const callback of callbacks) callback(now)
      for (const [id, timer] of [...timers.entries()])
        if (timer.when <= now) {
          timers.delete(id)
          timer.callback()
        }
    }
  }
  const key = (code, down = true, repeat = false) =>
    window.dispatchEvent(
      new window.KeyboardEvent(down ? 'keydown' : 'keyup', {
        code,
        key: code === 'Space' ? ' ' : code,
        repeat,
        bubbles: true,
      }),
    )
  const press = (code) => {
    key(code)
    key(code, false)
  }
  const state = () => window.__game
  const screenshot = (filename) => {
    const element = window.document.querySelector('canvas')
    assert(element, 'Runtime did not create a canvas')
    writeFileSync(join(captures, filename), canvases.get(element).toBuffer('image/png'))
  }
  tick(2)
  assert(
    window.__game,
    `Setup did not reach its test hook: ${JSON.stringify({ errors, warnings })}`,
  )
  return {
    window,
    api,
    tick,
    key,
    press,
    state,
    screenshot,
    errors,
    warnings,
    sleep,
    dispose: () => window.close(),
  }
}

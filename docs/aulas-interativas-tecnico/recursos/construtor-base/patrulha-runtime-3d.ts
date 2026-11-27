/**
 * Adaptador de QA para os projetos progressivos da Patrulha.
 * Executa script.js intacto, acrescido apenas de uma sonda de leitura no invólucro de teste.
 * Reutiliza o runtime oficial composto, GLTFLoader, Three.js e Canvas2D reais.
 * A apresentação WebGL é substituída por um renderer sem desenho; não é smoke test do Estúdio.
 * Os acessores são criados somente para variáveis que o arquivo desta etapa declara.
 */

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { resolveCourseModels } from '../../../../packages/studio/src/core/courseModels'
import { gameThreeDRuntimeForVariant } from '../../../../packages/studio/src/official-extensions/game-3d/runtime'

const sharedRequire = createRequire(
  resolve(import.meta.dirname, '../../../../packages/studio/package.json'),
)
const { JSDOM } = (() => {
  try {
    return sharedRequire('jsdom')
  } catch {
    // O Blockly declara jsdom; Bun pode mantê-lo isolado nesse pacote.
    return createRequire(sharedRequire.resolve('blockly'))('jsdom')
  }
})()
const THREE = await import(
  pathToFileURL(sharedRequire.resolve('three').replace(/three\.cjs$/, 'three.module.js')).href
)
const localRequire = createRequire(import.meta.url)
const dependency = (name) => {
  try {
    return localRequire(name)
  } catch (error) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error
    return localRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, name))
  }
}
const { createCanvas } = dependency('@napi-rs/canvas')
const runtime = gameThreeDRuntimeForVariant('sem-kit-plataforma+sem-cenario-molda')

export async function bootPatrulha(project) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://studio.test/',
  })
  const { window } = dom
  // As peças da Patrulha vêm como referências da biblioteca dos cursos: o Estúdio as resolve
  // antes de rodar (preloadCourseModels); aqui também, para o motor ler os GLB de verdade.
  const assets = await resolveCourseModels(project.assets)
  window.__SZGAME_ASSETS_3D = Object.fromEntries(
    assets.map((asset) => [asset.name, { kind: asset.kind, dataUrl: asset.dataUrl }]),
  )
  window.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null
    if (!this._nativeCanvas)
      this._nativeCanvas = createCanvas(this.width || 300, this.height || 150)
    return this._nativeCanvas.getContext('2d')
  }
  let now = 1000,
    seq = 0
  const timers = new Map(),
    renderers = [],
    logs = []
  const setTimeoutFake = (fn, delay = 0) => {
    const id = ++seq
    timers.set(id, { fn, at: now + delay })
    return id
  }
  Object.defineProperty(window, 'innerWidth', { value: 1280 })
  Object.defineProperty(window, 'innerHeight', { value: 720 })
  Object.defineProperty(window, 'devicePixelRatio', { value: 1 })
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720 }
  }
  class Renderer {
    constructor({ canvas }) {
      this.domElement = canvas
      this.shadowMap = { enabled: false, type: 0 }
      this.capabilities = { maxTextures: 16 }
      this.info = { render: { calls: 0, triangles: 0 }, memory: {} }
      this.renderLists = { dispose() {} }
      this.ratio = 1
      renderers.push(this)
    }
    setPixelRatio(v) {
      this.ratio = v
    }
    getPixelRatio() {
      return this.ratio
    }
    setSize(w, h) {
      this.domElement.width = w
      this.domElement.height = h
    }
    setAnimationLoop(fn) {
      this.loop = fn
    }
    render(scene, camera) {
      scene.updateMatrixWorld(true)
      camera.updateMatrixWorld(true)
      this.lastScene = scene
      this.lastCamera = camera
    }
    dispose() {
      this.disposed = true
      this.loop = null
    }
    forceContextLoss() {}
    getContext() {
      return {
        getExtension() {
          return null
        },
      }
    }
  }
  const context = vm.createContext({
    window,
    document: window.document,
    navigator: window.navigator,
    THREE: { ...THREE, WebGLRenderer: Renderer },
    console: {
      log() {},
      warn(...a) {
        logs.push(['warn', ...a.map(String)])
      },
      error(...a) {
        logs.push(['error', ...a.map(String)])
      },
    },
    performance: { now: () => now },
    setTimeout: setTimeoutFake,
    clearTimeout: (id) => timers.delete(id),
    setInterval: setTimeoutFake,
    clearInterval: (id) => timers.delete(id),
    requestAnimationFrame: (fn) => setTimeoutFake(() => fn(now), 16),
    cancelAnimationFrame: (id) => timers.delete(id),
    AbortController,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Uint8Array,
    Float32Array,
    ArrayBuffer,
    atob,
    TextDecoder,
    TextEncoder,
    URL,
    Blob,
    fetch,
    __name: (fn, name) => Object.defineProperty(fn, 'name', { value: name, configurable: true }),
  })
  vm.runInContext(runtime.replace("import * as THREE from 'three';", ''), context, {
    timeout: 10000,
    importModuleDynamically: async (specifier) => {
      assert.ok(
        ['three/addons/loaders/GLTFLoader.js', 'three/addons/utils/SkeletonUtils.js'].includes(
          specifier,
        ),
        'Unexpected model dependency: ' + specifier,
      )
      return import(pathToFileURL(sharedRequire.resolve(specifier)).href)
    },
  })
  context.SZGame3D = window.SZGame3D
  const files = project.files
  const names = [
    'cena',
    'nave',
    'tiros',
    'asteroides',
    'moldeTiro',
    'moldeAsteroide',
    'estado',
    'naveX',
    'alvoAtivo',
    'velocidadeTiros',
    'velocidadeAsteroides',
    'pontos',
  ].filter((name) => new RegExp('\\b(?:let|const|var)\\s+' + name + '\\b').test(files['script.js']))
  const members = names
    .map((name) => `get ${name}(){return ${name}}, set ${name}(v){${name}=v}`)
    .join(',')
  const reads = ['estado', 'naveX', 'velocidadeTiros', 'velocidadeAsteroides', 'pontos'].filter(
    (name) => names.includes(name),
  )
  const hasLife = /SZGame3D\.setLife\(nave, 3\)/.test(files['script.js'])
  const probe = `\nwindow.__probe={${members},read:()=>({${reads.join(',')},${hasLife ? 'vidas:SZGame3D.lifeOf(nave),' : ''}x:nave.position.x,y:nave.position.y,z:nave.position.z})};\n`
  const last = files['script.js'].lastIndexOf('\n});')
  assert.ok(last >= 0, 'Generated factory envelope missing')
  const observed = files['script.js'].slice(0, last) + probe + files['script.js'].slice(last)
  vm.runInContext(observed, context, { timeout: 10000 })
  assert.ok(window.__probe, JSON.stringify(logs))
  function flush() {
    let spins = 0
    while (true) {
      const next = [...timers].find(([, t]) => t.at <= now)
      if (!next) break
      timers.delete(next[0])
      next[1].fn()
      if (++spins > 1000) throw new Error('timer loop')
    }
  }
  function step(dt = 1 / 60) {
    now += dt * 1000
    for (const r of [...renderers]) if (r.loop && !r.disposed) r.loop(now)
    flush()
  }
  function frames(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) step(dt)
  }
  async function waitForModels() {
    const deadline = Date.now() + 5000
    while (window.__szModelosPendentes > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10))
      flush()
    }
    assert.equal(
      window.__szModelosPendentes || 0,
      0,
      'Embedded model loading did not settle: ' + JSON.stringify(logs),
    )
    for (const name of ['nave', 'moldeAsteroide', 'moldeTiro']) {
      assert.equal(
        window.__probe[name].userData.sz.modelLoaded,
        true,
        name + ' must load its embedded GLB, not fallback geometry: ' + JSON.stringify(logs),
      )
      assert.ok(
        window.__probe[name].userData.sz.modelRoot,
        name + ' must contain a loaded model root',
      )
    }
  }
  function down(code, repeat = false) {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code, repeat, bubbles: true }))
  }
  function up(code) {
    window.dispatchEvent(new window.KeyboardEvent('keyup', { code, bubbles: true }))
  }
  function press(code) {
    down(code)
    up(code)
  }
  function clean() {
    const p = window.__probe
    context.SZGame3D.clearGroup(p.tiros)
    context.SZGame3D.clearGroup(p.asteroides)
  }
  function asteroid(x = 0, z = -8) {
    const p = window.__probe
    return context.SZGame3D.spawnCopy(p.asteroides, p.moldeAsteroide, x, 1, z)
  }
  function bullet(x = 0, z = -8) {
    const p = window.__probe
    return context.SZGame3D.spawnCopy(p.tiros, p.moldeTiro, x, 1, z)
  }
  async function restart() {
    const button = window.document.querySelector('.szr-screen button')
    assert.ok(button, 'Native final button absent')
    assert.equal(button.textContent, 'Voltar ao início')
    button.click()
    flush()
    await waitForModels()
    step()
  }
  function noErrors() {
    assert.deepEqual(logs, [], JSON.stringify(logs))
  }
  function dispose() {
    context.SZGame3D.disposeAll()
    window.close()
  }
  await waitForModels()
  step()
  return {
    window,
    context,
    names,
    step,
    frames,
    down,
    up,
    press,
    clean,
    asteroid,
    bullet,
    restart,
    noErrors,
    dispose,
    get p() {
      return window.__probe
    },
    get logs() {
      return logs
    },
    get renderers() {
      return renderers
    },
  }
}

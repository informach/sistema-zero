import { describe, expect, it } from 'bun:test'
import * as RealThree from 'three'
import { gameThreeDRuntime } from '../runtime'

const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

type Listener = (event: Record<string, unknown>) => void

class FakeCanvas {
  id = 'tela'
  width = 480
  height = 360
  clientWidth = 480
  clientHeight = 360
  style: Record<string, string> = {}
  private attributes = new Map<string, string>()
  private listeners = new Map<string, Set<Listener>>()

  addEventListener(name: string, listener: Listener) {
    const entries = this.listeners.get(name) ?? new Set<Listener>()
    entries.add(listener)
    this.listeners.set(name, entries)
  }

  removeEventListener(name: string, listener: Listener) {
    this.listeners.get(name)?.delete(listener)
  }

  requestPointerLock() {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string) {
    return this.attributes.has(name)
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }
  }
}

class FakeRenderer {
  shadowMap = { enabled: false, type: 0 }
  loop: unknown = null
  sizes: Array<[number, number, boolean]> = []

  setPixelRatio() {}

  setSize(width: number, height: number, updateStyle: boolean) {
    this.sizes.push([width, height, updateStyle])
  }

  setAnimationLoop(loop: unknown) {
    this.loop = loop
  }

  render() {}
  dispose() {}
  forceContextLoss() {}
}

interface RuntimeWorld {
  scene: RealThree.Scene
  camera: RealThree.Camera
  renderer: FakeRenderer
  _canvas: FakeCanvas
  _objects: RealThree.Object3D[]
  _models: RealThree.Object3D[]
  _solids: RealThree.Object3D[]
}

interface RuntimeApi {
  createScene(canvasId: string): RuntimeWorld
  createBox(world: RuntimeWorld, options?: { size?: number; color?: string }): RealThree.Mesh
  createModel(world: RuntimeWorld): RealThree.Group
  addToModel(model: RealThree.Group, part: RealThree.Object3D): void
  remove(world: RuntimeWorld, object: RealThree.Object3D): void
  setSolid(object: RealThree.Object3D): void
  setPosition(object: RealThree.Object3D, x: number, y: number, z: number): void
  fall(object: RealThree.Object3D): void
  isometricCamera(world: RuntimeWorld, follow: RealThree.Object3D | null): void
  topCamera(world: RuntimeWorld, follow: RealThree.Object3D | null): void
  createSwarm(world: RuntimeWorld): { items: RealThree.Object3D[]; world: RuntimeWorld }
  spawnInSwarm(
    swarm: { items: RealThree.Object3D[]; world: RuntimeWorld },
    original: RealThree.Object3D,
    x: number,
    y: number,
    z: number,
  ): RealThree.Object3D
  setColor(object: RealThree.Object3D, color: string): void
  setVisible(object: RealThree.Object3D, mode: string): void
  pickAtMouse(world: RuntimeWorld): RealThree.Object3D | null
  playNote(frequency: number, milliseconds: number): void
  disposeAll(): void
  fpsCamera(world: RuntimeWorld, object: RealThree.Object3D): void
}

function loadRuntime() {
  const listeners = new Map<string, Set<Listener>>()
  const canvases = new Map<string, FakeCanvas>()
  let audioCloseCalls = 0

  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}

    createOscillator() {
      return {
        type: 'square',
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      }
    }

    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      }
    }

    close() {
      audioCloseCalls += 1
      return Promise.resolve()
    }
  }

  const win = {
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: FakeAudioContext,
    SZGame3D: undefined,
    addEventListener(name: string, listener: Listener) {
      const entries = listeners.get(name) ?? new Set<Listener>()
      entries.add(listener)
      listeners.set(name, entries)
    },
    removeEventListener(name: string, listener: Listener) {
      listeners.get(name)?.delete(listener)
    },
  }

  const doc = {
    pointerLockElement: null as FakeCanvas | null,
    visibilityState: 'visible',
    getElementById(id: string) {
      const canvas = canvases.get(id) ?? new FakeCanvas()
      canvases.set(id, canvas)
      return canvas
    },
    addEventListener(name: string, listener: Listener) {
      const entries = listeners.get(`document:${name}`) ?? new Set<Listener>()
      entries.add(listener)
      listeners.set(`document:${name}`, entries)
    },
    exitPointerLock() {
      doc.pointerLockElement = null
    },
  }

  const THREE = { ...RealThree, WebGLRenderer: FakeRenderer }
  new Function('THREE', 'window', 'document', runtimeBody)(THREE, win, doc)

  return {
    api: win.SZGame3D as unknown as RuntimeApi,
    canvas(id: string) {
      return doc.getElementById(id)
    },
    setPointerLock(canvas: FakeCanvas | null) {
      doc.pointerLockElement = canvas
    },
    fire(name: string, event: Record<string, unknown> = {}) {
      for (const listener of listeners.get(name) ?? []) listener(event)
    },
    audioCloseCalls: () => audioCloseCalls,
  }
}

function meshColor(object: RealThree.Object3D): string {
  let color = ''
  object.traverse((node) => {
    if (color || !(node instanceof RealThree.Mesh)) return
    const material = Array.isArray(node.material) ? node.material[0] : node.material
    if (material && 'color' in material && material.color instanceof RealThree.Color) {
      color = material.color.getHexString()
    }
  })
  return color
}

describe('gameThreeDRuntime - ciclo de vida real com Three.js', () => {
  it('prepara o canvas para navegação por teclado e tecnologias assistivas', () => {
    const { api, canvas } = loadRuntime()

    api.createScene('tela')

    expect(canvas('tela').getAttribute('tabindex')).toBe('0')
    expect(canvas('tela').getAttribute('aria-label')).toMatch(/jogo 3D/i)
    expect(canvas('tela').getAttribute('aria-describedby')).toBe('tela-sz-game-3d-description')
  })

  it('desregistra as peças quando remove um modelo e quando um objeto termina de cair', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const part = api.createBox(world)
    api.addToModel(model, part)
    api.setSolid(part)

    api.remove(world, model)

    expect(world._models).not.toContain(model)
    expect(world._objects).not.toContain(part)
    expect(world._solids).not.toContain(part)

    const falling = api.createBox(world)
    api.setSolid(falling)
    api.setPosition(falling, 0, -30, 0)
    api.fall(falling)

    expect(world._objects).not.toContain(falling)
    expect(world._solids).not.toContain(falling)
  })

  it('reutiliza câmeras ortográficas e recalcula a projeção no resize', () => {
    const { api, canvas, fire } = loadRuntime()
    const world = api.createScene('tela')

    api.isometricCamera(world, null)
    const first = world.camera as RealThree.OrthographicCamera
    api.isometricCamera(world, null)
    expect(world.camera).toBe(first)
    expect(world.scene.children.filter((child) => child instanceof RealThree.Camera)).toHaveLength(
      1,
    )

    const beforeWidth = first.right - first.left
    const targetCanvas = canvas('tela')
    targetCanvas.clientWidth = 960
    targetCanvas.clientHeight = 360
    fire('resize')
    expect(first.right - first.left).toBeGreaterThan(beforeWidth)

    api.topCamera(world, null)
    const top = world.camera
    api.topCamera(world, null)
    expect(world.camera).toBe(top)
    expect(first.parent).toBeNull()
    expect(world.scene.children.filter((child) => child instanceof RealThree.Camera)).toHaveLength(
      1,
    )
  })

  it('clona os materiais de cada peça quando o original do enxame é um modelo', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const part = api.createBox(world, { color: '#ffffff' })
    api.addToModel(model, part)
    const swarm = api.createSwarm(world)
    const first = api.spawnInSwarm(swarm, model, -1, 0, 0)
    const second = api.spawnInSwarm(swarm, model, 1, 0, 0)

    api.setColor(first, '#ff0000')

    expect(meshColor(first)).toBe('ff0000')
    expect(meshColor(model)).toBe('ffffff')
    expect(meshColor(second)).toBe('ffffff')
  })

  it('fecha o contexto de áudio no descarte completo', () => {
    const runtime = loadRuntime()
    runtime.api.playNote(440, 100)
    runtime.api.disposeAll()
    expect(runtime.audioCloseCalls()).toBe(1)
  })

  it('ignora objetos invisíveis e ancestrais escondidos no raycast', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const part = api.createBox(world)
    api.addToModel(model, part)

    expect(api.pickAtMouse(world)).toBe(part)
    api.setVisible(model, 'hide')
    expect(api.pickAtMouse(world)).toBeNull()
  })

  it('move apenas a câmera FPS do canvas que possui o pointer lock', () => {
    const runtime = loadRuntime()
    const firstWorld = runtime.api.createScene('primeiro')
    const secondWorld = runtime.api.createScene('segundo')
    const firstPlayer = runtime.api.createBox(firstWorld)
    const secondPlayer = runtime.api.createBox(secondWorld)
    runtime.api.fpsCamera(firstWorld, firstPlayer)
    runtime.api.fpsCamera(secondWorld, secondPlayer)
    runtime.setPointerLock(runtime.canvas('primeiro'))

    runtime.fire('mousemove', { movementX: 20, movementY: 0 })

    expect(firstPlayer.rotation.y).not.toBe(0)
    expect(secondPlayer.rotation.y).toBe(0)
  })
})

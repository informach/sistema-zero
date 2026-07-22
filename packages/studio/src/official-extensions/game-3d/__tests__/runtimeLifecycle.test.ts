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
  loop: ((time: number) => void) | null = null
  renderCalls = 0
  sizes: Array<[number, number, boolean]> = []

  setPixelRatio() {}

  setSize(width: number, height: number, updateStyle: boolean) {
    this.sizes.push([width, height, updateStyle])
  }

  setAnimationLoop(loop: ((time: number) => void) | null) {
    this.loop = loop
  }

  render() {
    this.renderCalls += 1
  }
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
  _crossing?: {
    gameOver: boolean
    nextRow: number
    rowByIndex: Record<string, { vehicles: Array<{ ref: RealThree.Object3D }>; type: string }>
  }
  _race?: {
    gameOver: boolean
    totalAngle: number
    spawnElapsed: number
    rivals: Array<{ mesh: RealThree.Object3D; angle: number }>
  }
}

interface RuntimeApi {
  createScene(canvasId: string): RuntimeWorld
  createBox(world: RuntimeWorld, options?: { size?: number; color?: string }): RealThree.Mesh
  createModel(world: RuntimeWorld): RealThree.Group
  addToModel(model: RealThree.Group, part: RealThree.Object3D): void
  animate(world: RuntimeWorld, callback: (delta: number) => void): void
  remove(world: RuntimeWorld, object: RealThree.Object3D): void
  setSolid(object: RealThree.Object3D): void
  setPosition(object: RealThree.Object3D, x: number, y: number, z: number): void
  fall(object: RealThree.Object3D): void
  isometricCamera(world: RuntimeWorld, follow: RealThree.Object3D | null): void
  topCamera(world: RuntimeWorld, follow: RealThree.Object3D | null): void
  orbitCamera(world: RuntimeWorld, follow: RealThree.Object3D | null): void
  thirdPersonCamera(
    world: RuntimeWorld,
    follow: RealThree.Object3D,
    distance: number,
    height: number,
  ): void
  createSwarm(world: RuntimeWorld): { items: RealThree.Object3D[]; world: RuntimeWorld }
  spawnInSwarm(
    swarm: { items: RealThree.Object3D[]; world: RuntimeWorld },
    original: RealThree.Object3D,
    x: number,
    y: number,
    z: number,
  ): RealThree.Object3D | null
  removeFromSwarm(
    swarm: { items: RealThree.Object3D[]; world: RuntimeWorld },
    item: RealThree.Object3D,
  ): void
  setColor(object: RealThree.Object3D, color: string): void
  setVisible(object: RealThree.Object3D, mode: string): void
  pickAtMouse(world: RuntimeWorld): RealThree.Object3D | null
  playNote(frequency: number, milliseconds: number): void
  disposeAll(): void
  fpsCamera(world: RuntimeWorld, object: RealThree.Object3D): void
  aimAhead(
    world: RuntimeWorld,
    object: RealThree.Object3D,
    distance: number,
  ): RealThree.Object3D | null
  onGround(world: RuntimeWorld, object: RealThree.Object3D): boolean
  groundHeight(world: RuntimeWorld, object: RealThree.Object3D): number
  createCrossingScene(canvasId: string): RuntimeWorld
  createCrosser(world: RuntimeWorld, options?: { color?: string }): RealThree.Object3D
  crosserMove(object: RealThree.Object3D, direction: string): void
  crosserStep(object: RealThree.Object3D, world: RuntimeWorld): void
  crosserReset(object: RealThree.Object3D, world: RuntimeWorld): void
  addRow(world: RuntimeWorld, row: number, kind: string, direction: string, speed: number): void
  moveTraffic(world: RuntimeWorld): void
  createRaceScene(canvasId: string): RuntimeWorld
  createRaceTrack(world: RuntimeWorld): void
  createRaceCar(world: RuntimeWorld, options?: { color?: string }): RealThree.Object3D
  raceStep(car: RealThree.Object3D, world: RuntimeWorld): void
  raceControl(car: RealThree.Object3D, mode: string): void
  runRivals(world: RuntimeWorld): void
  raceReset(car: RealThree.Object3D, world: RuntimeWorld): void
}

function loadRuntime() {
  const listeners = new Map<string, Set<Listener>>()
  const canvases = new Map<string, FakeCanvas>()
  let audioCloseCalls = 0
  let audioDisconnectCalls = 0
  const oscillators: Array<{
    onended: (() => void) | null
    stopCalls: number
    disconnect(): void
  }> = []

  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}

    createOscillator() {
      const oscillator = {
        type: 'square',
        onended: null as (() => void) | null,
        stopCalls: 0,
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {
          oscillator.stopCalls += 1
        },
        disconnect() {
          audioDisconnectCalls += 1
        },
      }
      oscillators.push(oscillator)
      return oscillator
    }

    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() {
          audioDisconnectCalls += 1
        },
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
    audioOscillatorCount: () => oscillators.length,
    audioDisconnectCalls: () => audioDisconnectCalls,
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

    if (!first || !second) throw new Error('Era esperado criar os dois itens do enxame')

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

  it('limita as vozes simultâneas e desconecta todas no descarte', () => {
    const runtime = loadRuntime()

    for (let note = 0; note < 100; note += 1) runtime.api.playNote(440, 10_000)

    expect(runtime.audioOscillatorCount()).toBe(32)
    runtime.api.disposeAll()
    expect(runtime.audioDisconnectCalls()).toBeGreaterThanOrEqual(64)
  })

  it('mantém a geometria do molde enquanto houver cópias no enxame', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const original = api.createBox(world)
    const geometry = original.geometry
    let disposeCalls = 0
    geometry.dispose = () => {
      disposeCalls += 1
    }
    const swarm = api.createSwarm(world)
    const first = api.spawnInSwarm(swarm, original, -1, 0, 0)
    const second = api.spawnInSwarm(swarm, original, 1, 0, 0)
    if (!first || !second) throw new Error('esperava duas cópias no enxame')

    api.remove(world, original)
    expect(disposeCalls).toBe(0)
    api.removeFromSwarm(swarm, first)
    expect(disposeCalls).toBe(0)
    api.removeFromSwarm(swarm, second)
    expect(disposeCalls).toBe(1)
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

  it('executa todos os blocos a cada quadro ligados à mesma cena', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const chamadas: string[] = []

    api.animate(world, () => chamadas.push('primeiro'))
    api.animate(world, () => chamadas.push('segundo'))
    world.renderer.loop?.(16)

    expect(chamadas).toEqual(['primeiro', 'segundo'])
    expect(world.renderer.renderCalls).toBe(1)
  })

  it('remove o objeto de seu mundo real mesmo quando recebe outra cena', () => {
    const { api } = loadRuntime()
    const firstWorld = api.createScene('primeiro')
    const secondWorld = api.createScene('segundo')
    const object = api.createBox(firstWorld)

    api.remove(secondWorld, object)

    expect(firstWorld._objects).not.toContain(object)
    expect(object.parent).toBeNull()
  })

  it('não mistura modelos, peças e enxames de cenas diferentes', () => {
    const { api } = loadRuntime()
    const firstWorld = api.createScene('primeiro')
    const secondWorld = api.createScene('segundo')
    const part = api.createBox(firstWorld)
    const model = api.createModel(secondWorld)

    api.addToModel(model, part)

    expect(part.parent).toBe(firstWorld.scene)
    expect(firstWorld._objects).toContain(part)

    const swarm = api.createSwarm(secondWorld)
    expect(api.spawnInSwarm(swarm, part, 0, 0, 0)).toBeNull()
    expect(swarm.items).toHaveLength(0)
  })

  it('mantém apenas o modo de câmera escolhido por último', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world)

    api.thirdPersonCamera(world, player, 6, 3)
    api.orbitCamera(world, player)
    const orbitPosition = world.camera.position.clone()
    api.animate(world, () => undefined)
    world.renderer.loop?.(16)

    expect(world.camera.position.distanceTo(orbitPosition)).toBeLessThan(0.0001)
  })

  it('não reinicia a rotação quando a câmera FPS é chamada novamente no quadro', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world)
    api.fpsCamera(world, player)
    player.rotation.y = 0.8
    world.camera.rotation.x = 0.4

    api.fpsCamera(world, player)

    expect(player.rotation.y).toBe(0.8)
    expect(world.camera.rotation.x).toBe(0.4)
  })

  it('ignora as próprias peças de um modelo ao mirar e procurar o chão', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const frontPart = api.createBox(world)
    api.setPosition(frontPart, 0, 0, 1)
    api.addToModel(model, frontPart)
    const target = api.createBox(world)
    api.setPosition(target, 0, 0, 3)

    expect(api.aimAhead(world, model, 10)).toBe(target)

    const foot = api.createBox(world)
    api.setPosition(foot, 0, -1, 0)
    api.addToModel(model, foot)
    api.setPosition(model, 0, 1.5, 0)
    const ground = api.createBox(world)
    api.setPosition(ground, 0, -0.5, 0)

    expect(api.groundHeight(world, model)).toBeCloseTo(0)
    expect(api.onGround(world, model)).toBe(true)
  })

  it('congela a travessia depois do fim de jogo', () => {
    const { api } = loadRuntime()
    const world = api.createCrossingScene('travessia')
    const player = api.createCrosser(world)
    api.crosserStep(player, world)
    api.crosserMove(player, 'forward')
    api.addRow(world, 1, 'car', 'right', 150)
    const traffic = world._crossing?.rowByIndex['1']?.vehicles[0]?.ref
    expect(traffic).toBeDefined()
    world._crossing!.gameOver = true
    const playerPosition = player.position.clone()
    const trafficPosition = traffic!.position.clone()

    for (let frame = 0; frame < 20; frame += 1) api.crosserStep(player, world)
    api.moveTraffic(world)

    expect(player.position.distanceTo(playerPosition)).toBe(0)
    expect(traffic!.position.distanceTo(trafficPosition)).toBe(0)

    api.crosserReset(player, world)
    api.crosserMove(player, 'forward')
    for (let frame = 0; frame < 20; frame += 1) api.crosserStep(player, world)
    expect(player.position.distanceTo(playerPosition)).toBeGreaterThan(0)
  })

  it('congela a corrida depois do fim de jogo', () => {
    const { api } = loadRuntime()
    const world = api.createRaceScene('corrida')
    api.createRaceTrack(world)
    const car = api.createRaceCar(world)
    world._race!.gameOver = true
    const position = car.position.clone()
    const angle = world._race!.totalAngle

    api.raceControl(car, 'accelerate')
    api.raceStep(car, world)
    api.runRivals(world)

    expect(car.position.distanceTo(position)).toBe(0)
    expect(world._race!.totalAngle).toBe(angle)
    expect(world._race!.rivals).toHaveLength(0)
    expect(car.userData.throttle).toBe('normal')

    api.raceReset(car, world)
    api.raceControl(car, 'accelerate')
    api.raceStep(car, world)
    expect(world._race!.totalAngle).toBeGreaterThan(angle)
    expect(car.userData.throttle).toBe('accelerate')
  })
})

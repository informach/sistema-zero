import { describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { gameThreeDRuntime } from '../runtime'

// Full review (R2): "jogar de verdade" os kits.
//
// game3d.test.ts só valida o SCHEMA da IR dos exemplos (nunca roda), e
// runtimeLifecycle.test.ts prova o congelamento FORÇANDO `gameOver = true`. O que
// faltava era a COLISÃO POSITIVA de verdade levando ao game-over — em especial a
// batida da Travessia durante o PULO (a correção R1/A1), que exige rodar o
// stepper real quadro a quadro. Aqui rodamos os kits sobre o Three.js REAL
// (geometrias/Box3/câmeras de verdade), com um renderer e um canvas falsos.

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
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }
  }
}

class FakeRenderer {
  shadowMap = { enabled: false, type: 0 }
  loop: ((time: number) => void) | null = null
  setPixelRatio() {}
  setSize() {}
  setAnimationLoop(loop: ((time: number) => void) | null) {
    this.loop = loop
  }
  render() {}
  dispose() {}
  forceContextLoss() {}
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createOscillator() {
    return {
      type: 'square',
      onended: null,
      frequency: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
        linearRampToValueAtTime() {},
      },
      connect() {},
      start() {},
      stop() {},
      disconnect() {},
    }
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    }
  }
  close() {
    return Promise.resolve()
  }
}

interface RaceWorld {
  _crossing?: {
    gameOver: boolean
    nextRow: number
    tileSize: number
    rowByIndex: Record<string, { type: string; vehicles: Array<{ ref: THREE.Object3D }> }>
  }
  _race?: {
    gameOver: boolean
    totalAngle: number
    rivals: Array<{ mesh: THREE.Object3D }>
  }
  _dt?: number
}

interface PlayApi {
  createCrossingScene(canvasId: string): RaceWorld
  createCrosser(world: RaceWorld, options?: { color?: string }): THREE.Object3D
  crosserMove(object: THREE.Object3D, direction: string): void
  crosserStep(object: THREE.Object3D, world: RaceWorld): void
  crosserReset(object: THREE.Object3D, world: RaceWorld): void
  crosserHit(object: THREE.Object3D, world: RaceWorld): boolean
  addRow(world: RaceWorld, row: number, kind: string, direction: string, speed: number): void
  createRaceScene(canvasId: string): RaceWorld
  createRaceTrack(world: RaceWorld): void
  createRaceCar(world: RaceWorld, options?: { color?: string }): THREE.Object3D
  raceStep(car: THREE.Object3D, world: RaceWorld): void
  raceControl(car: THREE.Object3D, mode: string): void
  runRivals(world: RaceWorld): void
  raceReset(car: THREE.Object3D, world: RaceWorld): void
  raceHit(car: THREE.Object3D, world: RaceWorld): boolean
  createScene(canvasId: string): RaceWorld
  createBox(world: RaceWorld, options?: { size?: number; color?: string }): THREE.Object3D
  createBlock(
    world: RaceWorld,
    options?: { width?: number; height?: number; depth?: number },
  ): THREE.Object3D
  createGroup(): THREE.Object3D[]
  setPosition(object: THREE.Object3D, x: number, y: number, z: number): void
  runEnemies(
    world: RaceWorld,
    group: THREE.Object3D[],
    ground: THREE.Object3D,
    every: number,
    speed: number,
  ): void
  hitAny(object: THREE.Object3D, group: THREE.Object3D[]): boolean
  animate(world: RaceWorld, callback: (delta: number) => void): void
  stop(world: RaceWorld): void
}

const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

function loadRuntime(): { api: PlayApi } {
  const canvases = new Map<string, FakeCanvas>()
  const listeners = new Map<string, Set<Listener>>()
  const win = {
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: FakeAudioContext,
    SZGame3D: undefined as unknown,
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
    addEventListener() {},
    exitPointerLock() {
      doc.pointerLockElement = null
    },
  }
  const THREEinj = { ...THREE, WebGLRenderer: FakeRenderer }
  new Function('THREE', 'window', 'document', runtimeBody)(THREEinj, win, doc)
  return { api: win.SZGame3D as unknown as PlayApi }
}

describe('gameThreeDRuntime — playthrough dos kits (Three.js real)', () => {
  it('Travessia: pular para a faixa do carro PERDE durante o hop (R1/A1), congela e reinicia', () => {
    const { api } = loadRuntime()
    const world = api.createCrossingScene('tela')
    const player = api.createCrosser(world)
    const cs = world._crossing
    if (!cs) throw new Error('sem estado de travessia')

    // Um carro parado na linha 1 (o destino do próximo pulo). speed 0 = não anda.
    api.addRow(world, 1, 'car', 'right', 0)
    // Trava o mapa nesse estado: crosserStep não deve regenerar/cortar a linha 1.
    cs.nextRow = 60
    const carRow = cs.rowByIndex['1']
    if (!carRow) throw new Error('addRow não criou a linha de carro')
    expect(carRow.type).toBe('car')
    const vehicle = carRow.vehicles[0]?.ref
    if (!vehicle) throw new Error('a linha de carro não tem veículo')

    // Começa o pulo para a frente (linha 0 -> 1). Durante o hop, g.row ainda é 0.
    api.crosserMove(player, 'forward')
    let lostMidHop = false
    for (let f = 0; f < 12 && !cs.gameOver; f++) {
      api.crosserStep(player, world)
      // Mantém o carro na coluna do jogador para garantir a sobreposição no hop.
      vehicle.position.set(player.position.x, player.position.y, player.position.z)
      const grid = (player as unknown as { userData: { grid: { moving: boolean; row: number } } })
        .userData.grid
      if (grid.moving && grid.row === 0 && api.crosserHit(player, world)) lostMidHop = true
    }
    // Pegou o carro da linha 1 enquanto o boneco ainda estava (logicamente) na linha 0.
    expect(lostMidHop).toBe(true)
    expect(cs.gameOver).toBe(true)

    // Congela: com gameOver, crosserStep não move mais o jogador.
    const frozenY = player.position.y
    api.crosserStep(player, world)
    api.crosserStep(player, world)
    expect(player.position.y).toBeCloseTo(frozenY, 6)

    // Reinicia: limpa o gameOver e volta o boneco para a origem.
    api.crosserReset(player, world)
    expect(cs.gameOver).toBe(false)
    expect(player.position.y).toBeCloseTo(0, 6)
  })

  it('Corrida: bater num rival PERDE, congela o carro e reinicia', () => {
    const { api } = loadRuntime()
    const world = api.createRaceScene('tela')
    api.createRaceTrack(world)
    const car = api.createRaceCar(world)
    const rs = world._race
    if (!rs) throw new Error('sem estado de corrida')

    // Faz nascer um rival (o motor solta um a cada 2,5 s de tempo acumulado).
    world._dt = 3
    api.runRivals(world)
    expect(rs.rivals.length).toBeGreaterThan(0)

    // Coloca o rival em cima do carro: raceHit usa distância < 1,4.
    const rival = rs.rivals[0]?.mesh
    if (!rival) throw new Error('nenhum rival nasceu')
    rival.position.set(car.position.x, car.position.y, car.position.z)
    expect(api.raceHit(car, world)).toBe(true)
    expect(rs.gameOver).toBe(true)

    // Congela: raceStep não avança mais o ângulo depois do game-over.
    const angleAtLose = rs.totalAngle
    api.raceStep(car, world)
    expect(rs.totalAngle).toBeCloseTo(angleAtLose, 6)

    // Reinicia: some com os rivais e limpa o game-over.
    api.raceReset(car, world)
    expect(rs.gameOver).toBe(false)
    expect(rs.rivals.length).toBe(0)
  })

  it('Corrida: acelerar faz o carro AVANÇAR pela pista ao longo dos quadros', () => {
    const { api } = loadRuntime()
    const world = api.createRaceScene('tela')
    api.createRaceTrack(world)
    const car = api.createRaceCar(world)
    const rs = world._race
    if (!rs) throw new Error('sem estado de corrida')
    api.raceControl(car, 'accelerate')
    const startAngle = rs.totalAngle
    const startX = car.position.x
    for (let f = 0; f < 300; f++) api.raceStep(car, world)
    expect(rs.totalAngle).toBeGreaterThan(startAngle) // deu voltas
    expect(car.position.x).not.toBeCloseTo(startX, 3) // o carro saiu do lugar
  })

  it('Desvie: um inimigo alcançar o jogador aciona a batida (hitAny) e o "fim de jogo" para o loop', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world, { size: 1 })
    api.setPosition(player, 0, 0, 0)
    const ground = api.createBlock(world, { width: 20, height: 1, depth: 8 })
    api.setPosition(ground, 0, -1, 0)
    const enemies = api.createGroup()

    // Deixa o motor soltar inimigos por alguns quadros.
    for (let f = 0; f < 30; f++) api.runEnemies(world, enemies, ground, 20, 0.2)
    expect(enemies.length).toBeGreaterThan(0)

    // Empurra um inimigo para cima do jogador: a batida tem de ser detectada.
    const enemy = enemies[0]
    if (!enemy) throw new Error('nenhum inimigo nasceu')
    enemy.position.set(0, 0, 0)
    expect(api.hitAny(player, enemies)).toBe(true)

    // O "fim de jogo" (stop) para o loop de animação da cena.
    api.animate(world, () => {})
    const renderer = (world as unknown as { renderer: FakeRenderer }).renderer
    expect(renderer.loop).not.toBeNull() // o loop está instalado e rodando
    api.stop(world)
    expect(renderer.loop).toBeNull() // stop desinstalou o loop
  })
})

// Empilhar (encaixar/errar/pontuar/reiniciar) já é coberto fim-a-fim em physics.test.ts.

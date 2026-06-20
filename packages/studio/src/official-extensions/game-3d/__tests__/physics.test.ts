import { describe, expect, it } from 'bun:test'
import { gameThreeDRuntime } from '../runtime'

// O runtime de física precisa LER coordenadas (position/scale com x/y/z reais),
// ao contrário do teste de higiene de GPU (Vec3 mínimo). Por isso este arquivo
// tem seu próprio fake de Three.js mais rico. Tiramos o import e rodamos o IIFE.
const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

interface Vec3 {
  x: number
  y: number
  z: number
  set(x: number, y: number, z: number): Vec3
  lookAt?: () => void
}
interface Meta {
  hw: number
  hh: number
  hd: number
  vx: number
  vy: number
  vz: number
  grounded: boolean
  zAccel: boolean
  gravity: number
}
interface Obj3D {
  position: Vec3
  scale: Vec3
  rotation: Vec3
  userData: { sz: Meta }
}
interface Renderer {
  setAnimationLoop(fn: unknown): void
  _loop?: unknown
}
interface World {
  renderer: Renderer
  camera: { position: Vec3; lookAt: () => void }
  scene: { children: unknown[] }
  _objects: unknown[]
}
type Group = Obj3D[]
interface API {
  createScene(id: string): World
  createBox(w: World, o?: { size?: number; color?: string }): Obj3D
  createBlock(
    w: World,
    o?: { width?: number; height?: number; depth?: number; color?: string },
  ): Obj3D
  createGroup(): Group
  setPosition(o: Obj3D, x: number, y: number, z: number): void
  setCameraPosition(w: World, x: number, y: number, z: number): void
  setVelocity(o: Obj3D, x: number, y: number, z: number): void
  applyGravity(o: Obj3D, g: Obj3D): void
  jump(o: Obj3D, f: number): void
  controlWithKeys(o: Obj3D, s: number): void
  cameraFollow(w: World, o: Obj3D): void
  keyDown(code: string): boolean
  collides(a: Obj3D, b: Obj3D): boolean
  hitAny(o: Obj3D, g: Group): boolean
  runEnemies(w: World, g: Group, ground: Obj3D, every: number, speed: number): void
  stop(w: World): void
  gridMove(o: Obj3D, dir: string): void
  gridStep(o: Obj3D): void
  moveAcross(g: Group, speed: number, min: number, max: number): void
  touchesBox(o: Obj3D, g: Group): boolean
}

function loadRuntime(): { api: API; fire: (name: string, ev: unknown) => void } {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}

  class V3 implements Vec3 {
    x: number
    y: number
    z: number
    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }
    set(x: number, y: number, z: number): Vec3 {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
    lookAt() {}
  }

  const THREE = {
    // biome-ignore lint/complexity/useArrowFunction: construtor (chamado com `new`)
    WebGLRenderer: function () {
      return {
        shadowMap: { enabled: false, type: 0 },
        setPixelRatio() {},
        setSize() {},
        setAnimationLoop(fn: unknown) {
          ;(this as Renderer)._loop = fn
        },
        render() {},
        dispose() {},
        forceContextLoss() {},
      }
    } as unknown as new () => Renderer,
    PCFSoftShadowMap: 1,
    Scene: class {
      background: unknown = null
      children: unknown[] = []
      add(o: unknown) {
        this.children.push(o)
      }
      remove(o: unknown) {
        const i = this.children.indexOf(o)
        if (i !== -1) this.children.splice(i, 1)
      }
    },
    Color: class {
      constructor(public value: unknown) {}
    },
    PerspectiveCamera: class {
      position = new V3(0, 0, 5)
      lookAt() {}
    },
    AmbientLight: class {},
    DirectionalLight: class {
      position = new V3()
      castShadow = false
      shadow = { camera: {} as Record<string, number>, mapSize: { set() {} } }
    },
    MeshStandardMaterial: class {
      dispose() {}
    },
    Mesh: class {
      position = new V3(0, 0, 0)
      rotation = new V3(0, 0, 0)
      scale = new V3(1, 1, 1)
      castShadow = false
      receiveShadow = false
      userData: Record<string, unknown> = {}
      geometry: unknown
      material: unknown
      constructor(geometry?: unknown, material?: unknown) {
        this.geometry = geometry
        this.material = material
      }
    },
    BoxGeometry: class {
      dispose() {}
    },
    SphereGeometry: class {
      dispose() {}
    },
    // AABB simples a partir da posição do objeto (suficiente p/ touchesBox em
    // objetos de topo; os modelos compostos são validados no browser).
    Box3: class {
      min = { x: 0, y: 0, z: 0 }
      max = { x: 0, y: 0, z: 0 }
      setFromObject(o: { position?: { x: number; y: number; z: number } }) {
        const p = o.position ?? { x: 0, y: 0, z: 0 }
        this.min = { x: p.x - 0.5, y: p.y - 0.5, z: p.z - 0.5 }
        this.max = { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }
        return this
      }
      intersectsBox(b: {
        min: { x: number; y: number; z: number }
        max: { x: number; y: number; z: number }
      }) {
        return (
          this.min.x <= b.max.x &&
          this.max.x >= b.min.x &&
          this.min.y <= b.max.y &&
          this.max.y >= b.min.y &&
          this.min.z <= b.max.z &&
          this.max.z >= b.min.z
        )
      }
    },
  }

  const win = {
    devicePixelRatio: 1,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame3D: undefined,
  } as unknown as Record<string, unknown>

  const doc = { getElementById: () => ({ width: 400, height: 300 }) }

  new Function('THREE', 'window', 'document', runtimeBody)(THREE, win, doc)

  return {
    api: (win as unknown as { SZGame3D: API }).SZGame3D,
    fire: (name: string, ev: unknown) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
  }
}

describe('gameThreeDRuntime — teclado', () => {
  it('keyDown reflete keydown/keyup por event.code', () => {
    const { api, fire } = loadRuntime()
    expect(api.keyDown('KeyW')).toBe(false)
    fire('keydown', { code: 'KeyW' })
    expect(api.keyDown('KeyW')).toBe(true)
    fire('keyup', { code: 'KeyW' })
    expect(api.keyDown('KeyW')).toBe(false)
  })

  it('espaço/setas chamam preventDefault (não rolam a página)', () => {
    const { api, fire } = loadRuntime()
    let prevented = false
    fire('keydown', { code: 'Space', preventDefault: () => (prevented = true) })
    expect(prevented).toBe(true)
    expect(api.keyDown('Space')).toBe(true)
  })
})

describe('gameThreeDRuntime — colisão (AABB)', () => {
  it('collides detecta sobreposição e separação', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const a = api.createBox(world, { size: 2 }) // meia-extensão = 1
    const b = api.createBox(world, { size: 2 })
    api.setPosition(a, 0, 0, 0)
    api.setPosition(b, 0.5, 0, 0)
    expect(api.collides(a, b)).toBe(true)
    api.setPosition(b, 5, 0, 0)
    expect(api.collides(a, b)).toBe(false)
  })
})

describe('gameThreeDRuntime — gravidade e pulo', () => {
  it('applyGravity puxa o objeto para baixo e o marca grounded ao tocar o chão', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world, { size: 1 })
    const ground = api.createBlock(world, { width: 10, height: 1, depth: 10 })
    api.setPosition(player, 0, 5, 0)
    api.setPosition(ground, 0, 0, 0)
    api.applyGravity(player, ground)
    expect(player.position.y).toBeLessThan(5)
    let grounded = false
    for (let i = 0; i < 3000; i++) {
      api.applyGravity(player, ground)
      if (player.userData.sz.grounded) {
        grounded = true
        break
      }
    }
    expect(grounded).toBe(true)
  })

  it('jump só impulsiona quando está no chão (não voa no ar)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    const s = p.userData.sz
    s.grounded = false
    api.jump(p, 0.08)
    expect(s.vy).toBe(0)
    s.grounded = true
    api.jump(p, 0.08)
    expect(s.vy).toBe(0.08)
    expect(s.grounded).toBe(false)
  })
})

describe('gameThreeDRuntime — controle por teclado', () => {
  it('controlWithKeys define vx/vz a partir das teclas (e zera ao soltar)', () => {
    const { api, fire } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.controlWithKeys(p, 0.05)
    expect(p.userData.sz.vx).toBe(0)
    expect(p.userData.sz.vz).toBe(0)
    fire('keydown', { code: 'KeyD' })
    api.controlWithKeys(p, 0.05)
    expect(p.userData.sz.vx).toBe(0.05)
    fire('keyup', { code: 'KeyD' })
    fire('keydown', { code: 'KeyW' })
    api.controlWithKeys(p, 0.05)
    expect(p.userData.sz.vz).toBe(-0.05)
    expect(p.userData.sz.vx).toBe(0)
  })
})

describe('gameThreeDRuntime — Kit Desvie (spawner + colisão de grupo)', () => {
  it('runEnemies solta inimigos no ritmo e DESCARTA os que passam (higiene de GPU)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const ground = api.createBlock(world, { width: 10, height: 1, depth: 10 })
    api.setPosition(ground, 0, -2, 0)
    const inimigos = api.createGroup()
    // every=5: no 5º quadro nasce 1 inimigo.
    for (let i = 0; i < 5; i++) api.runEnemies(world, inimigos, ground, 5, 0.02)
    expect(inimigos.length).toBe(1)
    const enemy = inimigos[0]
    if (!enemy) throw new Error('esperava um inimigo gerado')
    expect(enemy.userData.sz.zAccel).toBe(true)
    // empurra o inimigo para a frente da câmera → próxima volta deve removê-lo.
    enemy.position.z = 50
    const before = world._objects.length
    api.runEnemies(world, inimigos, ground, 5, 0.02)
    expect(inimigos.length).toBe(0)
    expect(world._objects.length).toBeLessThan(before)
  })

  it('hitAny é verdadeiro quando o jogador encosta em algum do grupo', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    const inimigos = api.createGroup()
    const e1 = api.createBox(world, { size: 1 })
    const e2 = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    api.setPosition(e1, 10, 0, 0)
    api.setPosition(e2, 0.3, 0, 0)
    inimigos.push(e1, e2)
    expect(api.hitAny(p, inimigos)).toBe(true)
    api.setPosition(e2, 10, 0, 0)
    expect(api.hitAny(p, inimigos)).toBe(false)
  })
})

describe('gameThreeDRuntime — câmera e fim de jogo', () => {
  it('cameraFollow mantém o deslocamento (offset) capturado', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setCameraPosition(world, 4, 3, 8)
    api.setPosition(p, 0, 0, 0)
    api.cameraFollow(world, p) // captura offset (4,3,8)
    api.setPosition(p, 2, 0, 0)
    api.cameraFollow(world, p)
    expect(world.camera.position.x).toBe(6)
    expect(world.camera.position.y).toBe(3)
    expect(world.camera.position.z).toBe(8)
  })

  it('stop para o loop de animação (setAnimationLoop(null))', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    api.stop(world)
    expect(world.renderer._loop).toBeNull()
  })
})

describe('gameThreeDRuntime — grade genérica (gridMove/gridStep/moveAcross/touchesBox)', () => {
  it('gridMove + gridStep avançam o objeto uma casa na grade', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    api.gridMove(p, 'forward')
    for (let i = 0; i < 12; i++) api.gridStep(p)
    expect(p.position.y).toBeGreaterThan(0.9)
  })

  it('moveAcross move os objetos e dá a volta nas bordas', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const carros = api.createGroup()
    const c = api.createBox(world, { size: 1 })
    api.setPosition(c, 2.5, 0, 0)
    carros.push(c)
    api.moveAcross(carros, 1, -2, 2) // 2.5 -> 3.5 (> 2) -> volta para -2
    expect(c.position.x).toBe(-2)
    api.setPosition(c, -2.5, 0, 0)
    api.moveAcross(carros, -1, -2, 2) // -2.5 -> -3.5 (< -2) -> volta para 2
    expect(c.position.x).toBe(2)
  })

  it('touchesBox detecta colisão por caixa contra um grupo', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    const grupo = api.createGroup()
    const a = api.createBox(world, { size: 1 })
    const b = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    api.setPosition(a, 5, 0, 0)
    api.setPosition(b, 0.3, 0, 0)
    grupo.push(a, b)
    expect(api.touchesBox(p, grupo)).toBe(true)
    api.setPosition(b, 5, 0, 0)
    expect(api.touchesBox(p, grupo)).toBe(false)
  })
})

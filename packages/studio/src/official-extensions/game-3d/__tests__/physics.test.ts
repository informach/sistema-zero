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
  geometry?: { disposed?: boolean }
  material?: { color?: { value?: unknown }; opacity?: number; disposed?: boolean }
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
  _dt?: number
  _stack?: {
    layers: unknown[]
    overhangs: unknown[]
    score: number
    gameOver: boolean
    moving: { mesh: Obj3D; direction: string } | null
  }
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
  gridPosition(o: Obj3D, row: number, col: number): void
  gridMove(o: Obj3D, dir: string): void
  gridStep(o: Obj3D): void
  moveAcross(g: Group, speed: number, min: number, max: number): void
  touchesBox(o: Obj3D, g: Group): boolean
  moveInCircle(o: Obj3D, radius: number, speed: number): void
  distanceTo(a: Obj3D, b: Obj3D): number
  isNear(a: Obj3D, b: Obj3D, dist: number): boolean
  fall(o: Obj3D): void
  slideBetween(o: Obj3D, axis: string, min: number, max: number, speed: number): void
  spin(o: Obj3D, axis: string, speed: number): void
  createStackScene(id: string): World
  createStackTower(w: World): void
  stackDrop(w: World): void
  stackStep(w: World): void
  stackReset(w: World): void
  stackScore(w: World): number
  stackGameOver(w: World): boolean
  getPos(o: Obj3D, axis: string): number
  getRot(o: Obj3D, axis: string): number
  getScale(o: Obj3D): number
  setScale(o: Obj3D, factor: number): void
  dt(w: World): number
  moveBy(o: Obj3D, dx: number, dy: number, dz: number): void
  rotateBy(o: Obj3D, axis: string, amount: number): void
  moveTowards(o: Obj3D, x: number, y: number, z: number, t: number): void
  animate(w: World, fn: (d: number) => void): void
  angleTo(a: Obj3D, b: Obj3D): number
  body(o: Obj3D, gravity: number): void
  setSolid(o: Obj3D): void
  stepBody(o: Obj3D, w: World): void
  platformerControls(o: Obj3D, w: World, speed: number, jump: number): void
  fpsControls(o: Obj3D, w: World, speed: number): void
  resolveCollision(a: Obj3D, b: Obj3D): void
  createModel(w: World): unknown
  addToModel(model: unknown, part: Obj3D): void
  setColor(obj: unknown, color: string): void
  setOpacity(obj: unknown, opacity: number): void
  remove(w: World, obj: unknown): void
  dispose(w: World): void
}

function loadRuntime(): {
  api: API
  fire: (name: string, ev: unknown) => void
  listenerCount: (name: string) => number
} {
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
        ;(o as { parent?: unknown }).parent = this
        this.children.push(o)
      }
      remove(o: unknown) {
        const i = this.children.indexOf(o)
        if (i !== -1) this.children.splice(i, 1)
        ;(o as { parent?: unknown }).parent = null
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
      color: { value: unknown; set: (value: unknown) => void }
      opacity = 1
      transparent = false
      needsUpdate = false
      disposed = false
      constructor(options?: { color?: unknown }) {
        this.color = {
          value: options?.color,
          set: (value: unknown) => {
            this.color.value = value
          },
        }
      }
      dispose() {
        this.disposed = true
      }
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
      disposed = false
      dispose() {
        this.disposed = true
      }
    },
    SphereGeometry: class {
      disposed = false
      dispose() {
        this.disposed = true
      }
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
    OrthographicCamera: class {
      position = new V3(4, 4, 4)
      up = new V3(0, 1, 0)
      lookAt() {}
    },
    Group: class {
      position = new V3(0, 0, 0)
      rotation = new V3(0, 0, 0)
      scale = new V3(1, 1, 1)
      userData: Record<string, unknown> = {}
      children: unknown[] = []
      add(o: unknown) {
        const child = o as { parent?: { remove?: (value: unknown) => void } }
        if (child.parent?.remove) child.parent.remove(o)
        child.parent = this
        this.children.push(o)
      }
      remove(o: unknown) {
        const i = this.children.indexOf(o)
        if (i !== -1) this.children.splice(i, 1)
        ;(o as { parent?: unknown }).parent = null
      }
      traverse(fn: (o: unknown) => void) {
        fn(this)
        for (const c of this.children) {
          const cc = c as { traverse?: (f: (o: unknown) => void) => void }
          if (cc.traverse) cc.traverse(fn)
          else fn(c)
        }
      }
    },
    MeshLambertMaterial: class {
      dispose() {}
    },
  }

  const win = {
    devicePixelRatio: 1,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    removeEventListener(name: string, fn: Listener) {
      const index = listeners[name]?.indexOf(fn) ?? -1
      if (index !== -1) listeners[name]?.splice(index, 1)
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
    listenerCount: (name: string) => listeners[name]?.length ?? 0,
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

  it('limpa teclas pressionadas quando a janela perde o foco', () => {
    const { api, fire } = loadRuntime()
    fire('keydown', { code: 'KeyW' })
    expect(api.keyDown('KeyW')).toBe(true)
    fire('blur', {})
    expect(api.keyDown('KeyW')).toBe(false)
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

describe('gameThreeDRuntime — modelos compostos', () => {
  it('aplica cor e opacidade a todas as primitivas filhas', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const head = api.createBox(world, { color: '#ffffff' })
    const body = api.createBox(world, { color: '#ffffff' })
    api.addToModel(model, head)
    api.addToModel(model, body)

    api.setColor(model, '#ff0000')
    api.setOpacity(model, 0.4)

    expect(head.material?.color?.value).toBe('#ff0000')
    expect(body.material?.color?.value).toBe('#ff0000')
    expect(head.material?.opacity).toBe(0.4)
    expect(body.material?.opacity).toBe(0.4)
  })

  it('remover um modelo descarta geometrias e materiais descendentes', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const model = api.createModel(world)
    const part = api.createBox(world)
    api.addToModel(model, part)

    api.remove(world, model)

    expect(part.geometry?.disposed).toBe(true)
    expect(part.material?.disposed).toBe(true)
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
    api.gridPosition(p, 0, 0)
    api.gridMove(p, 'forward')
    for (let i = 0; i < 12; i++) api.gridStep(p)
    expect(p.position.z).toBeGreaterThan(0.9)
    expect(p.position.y).toBe(0)
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

describe('gameThreeDRuntime — movimento circular e distância (genéricos do Kit Corrida)', () => {
  it('moveInCircle usa o plano do chão X-Z e preserva a altura Y', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 3, 0)
    api.moveInCircle(p, 5, 0.3)
    const x1 = p.position.x
    const z1 = p.position.z
    const r1 = Math.hypot(x1, z1)
    api.moveInCircle(p, 5, 0.3)
    const r2 = Math.hypot(p.position.x, p.position.z)
    expect(r1).toBeGreaterThan(4.5) // ~5
    expect(Math.abs(r2 - r1)).toBeLessThan(0.01) // raio constante ao girar
    expect(p.position.x !== x1 || p.position.z !== z1).toBe(true) // andou
    expect(p.position.y).toBe(3)
  })

  it('distanceTo e isNear medem a distância no chão X-Z', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const a = api.createBox(world, { size: 1 })
    const b = api.createBox(world, { size: 1 })
    api.setPosition(a, 0, 0, 0)
    api.setPosition(b, 3, 99, 4)
    expect(api.distanceTo(a, b)).toBeCloseTo(5)
    expect(api.isNear(a, b, 6)).toBe(true)
    expect(api.isNear(a, b, 4)).toBe(false)
  })
})

describe('gameThreeDRuntime — tempo consistente entre dispositivos', () => {
  function travelForOneSecond(frameMs: number): number {
    const { api, fire } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world, { size: 1 })
    fire('keydown', { code: 'KeyD' })
    api.animate(world, () => {
      api.controlWithKeys(player, 0.05)
      api.applyGravity(player, null as unknown as Obj3D)
    })
    const loop = world.renderer._loop as (time: number) => void
    loop(1)
    for (let time = frameMs; time <= 1000; time += frameMs) loop(time)
    return player.position.x
  }

  it('percorre praticamente a mesma distância a 60 Hz e 120 Hz', () => {
    const at60 = travelForOneSecond(1000 / 60)
    const at120 = travelForOneSecond(1000 / 120)
    expect(Math.abs(at60 - at120)).toBeLessThan(0.08)
  })
})

describe('gameThreeDRuntime — genéricos de movimento (cair, deslizar, girar)', () => {
  it('fall puxa o objeto para baixo girando (gravidade na mão)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 10, 0)
    for (let i = 0; i < 20; i++) api.fall(p)
    expect(p.position.y).toBeLessThan(10)
    expect(p.rotation.x !== 0 || p.rotation.z !== 0).toBe(true)
  })

  it('slideBetween vai e volta sem escapar dos limites', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    for (let i = 0; i < 200; i++) api.slideBetween(p, 'x', -3, 3, 0.5)
    expect(p.position.x).toBeGreaterThanOrEqual(-3)
    expect(p.position.x).toBeLessThanOrEqual(3)
    api.setPosition(p, 3, 0, 0)
    api.slideBetween(p, 'x', -3, 3, 0.5) // no teto, inverte e desce
    expect(p.position.x).toBeLessThan(3)
  })

  it('spin gira o objeto continuamente num eixo', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    const r0 = p.rotation.y
    api.spin(p, 'y', 0.1)
    api.spin(p, 'y', 0.1)
    expect(p.rotation.y).toBeCloseTo(r0 + 0.2)
  })
})

describe('gameThreeDRuntime — Kit Empilhar (corte/encaixe/pontuação)', () => {
  it('createStackScene + createStackTower montam a base e o bloco que desliza', () => {
    const { api } = loadRuntime()
    const world = api.createStackScene('jogo')
    api.createStackTower(world)
    expect(world._stack).toBeTruthy()
    expect(world._stack?.layers.length).toBe(2) // base + 1º bloco
    expect(world._stack?.moving).toBeTruthy()
    expect(world._stack?.gameOver).toBe(false)
  })

  it('stackStep desliza o bloco do topo', () => {
    const { api } = loadRuntime()
    const world = api.createStackScene('jogo')
    api.createStackTower(world)
    const moving = world._stack?.moving as { mesh: Obj3D; direction: string }
    const before = moving.mesh.position.x
    api.stackStep(world)
    api.stackStep(world)
    expect(moving.mesh.position.x).toBeGreaterThan(before)
  })

  it('stackDrop com encaixe corta o bloco e adiciona um andar (pontuação sobe)', () => {
    const { api } = loadRuntime()
    const world = api.createStackScene('jogo')
    api.createStackTower(world)
    const moving = world._stack?.moving as { mesh: Obj3D; direction: string }
    moving.mesh.position[moving.direction as 'x'] = 0.5 // quase em cima da base
    api.stackDrop(world)
    expect(world._stack?.layers.length).toBe(3) // base + cortado + próximo
    expect(world._stack?.score).toBe(1)
    expect(world._stack?.gameOver).toBe(false)
  })

  it('stackDrop sem encaixe (erro) acaba o jogo', () => {
    const { api } = loadRuntime()
    const world = api.createStackScene('jogo')
    api.createStackTower(world)
    const moving = world._stack?.moving as { mesh: Obj3D; direction: string }
    moving.mesh.position[moving.direction as 'x'] = 9 // longe da base
    api.stackDrop(world)
    expect(world._stack?.gameOver).toBe(true)
    expect(api.stackGameOver(world)).toBe(true)
  })

  it('stackReset limpa e recomeça a torre', () => {
    const { api } = loadRuntime()
    const world = api.createStackScene('jogo')
    api.createStackTower(world)
    const moving = world._stack?.moving as { mesh: Obj3D; direction: string }
    moving.mesh.position[moving.direction as 'x'] = 9
    api.stackDrop(world) // gameOver
    api.stackReset(world)
    expect(world._stack?.gameOver).toBe(false)
    expect(world._stack?.score).toBe(0)
    expect(world._stack?.layers.length).toBe(2)
  })
})

describe('gameThreeDRuntime — ler vetores, mover/girar relativo, suavizar e dt', () => {
  it('getPos/getRot/getScale leem a transformação do objeto', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 1, 2, 3)
    expect(api.getPos(p, 'x')).toBe(1)
    expect(api.getPos(p, 'y')).toBe(2)
    expect(api.getPos(p, 'z')).toBe(3)
    p.rotation.set(0.1, 0.2, 0.3)
    expect(api.getRot(p, 'y')).toBeCloseTo(0.2)
    api.setScale(p, 2)
    expect(api.getScale(p)).toBe(2)
  })

  it('moveBy soma à posição; rotateBy soma ao giro', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 1, 1, 1)
    api.moveBy(p, 1, 0, -1)
    expect(p.position.x).toBe(2)
    expect(p.position.y).toBe(1)
    expect(p.position.z).toBe(0)
    api.rotateBy(p, 'y', 0.5)
    api.rotateBy(p, 'y', 0.5)
    expect(p.rotation.y).toBeCloseTo(1)
  })

  it('moveTowards aproxima o objeto do alvo aos poucos (lerp)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    api.moveTowards(p, 10, 0, 0, 0.5)
    expect(p.position.x).toBeCloseTo(5)
    api.moveTowards(p, 10, 0, 0, 0.5)
    expect(p.position.x).toBeCloseTo(7.5)
  })

  it('dt mede o tempo entre quadros via animate (e é passado ao corpo)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    let seen = -1
    api.animate(world, (d) => {
      seen = d
    })
    const loop = (world.renderer as { _loop: (t: number) => void })._loop
    loop(1000) // 1º quadro: dt 0
    loop(1016) // ~16 ms depois
    expect(api.dt(world)).toBeGreaterThan(0)
    expect(api.dt(world)).toBeLessThan(0.05)
    expect(seen).toBeCloseTo(0.016, 2)
  })

  it('angleTo mede o ângulo no plano do chão (X-Z)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const a = api.createBox(world, { size: 1 })
    const b = api.createBox(world, { size: 1 })
    api.setPosition(a, 0, 0, 0)
    api.setPosition(b, 5, 0, 0) // direto no +x
    expect(api.angleTo(a, b)).toBeCloseTo(Math.PI / 2) // atan2(5, 0) = PI/2
    api.setPosition(b, 0, 0, 5) // direto no +z
    expect(api.angleTo(a, b)).toBeCloseTo(0) // atan2(0, 5) = 0
  })
})

describe('gameThreeDRuntime — física avançada (corpo, sólidos, presets)', () => {
  it('stepBody aplica gravidade e o objeto pousa no sólido', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const chao = api.createBlock(world, { width: 10, height: 1, depth: 10 })
    api.setPosition(chao, 0, 0, 0) // topo em y = 0.5
    api.setSolid(chao)
    const p = api.createBox(world, { size: 1 }) // meia-altura 0.5
    api.setPosition(p, 0, 5, 0)
    api.body(p, -0.05)
    let grounded = false
    for (let i = 0; i < 600; i++) {
      api.stepBody(p, world)
      if (p.userData.sz.grounded) {
        grounded = true
        break
      }
    }
    expect(grounded).toBe(true)
    expect(p.position.y).toBeCloseTo(1, 1) // pousa em topo(0.5) + meia-altura(0.5)
  })

  it('platformerControls move com o teclado', () => {
    const { api, fire } = loadRuntime()
    const world = api.createScene('tela')
    const p = api.createBox(world, { size: 1 })
    api.setPosition(p, 0, 0, 0)
    fire('keydown', { code: 'ArrowRight' })
    api.platformerControls(p, world, 0.1, 0.2)
    expect(p.position.x).toBeGreaterThan(0)
  })

  it('resolveCollision empurra A para fora de B', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const a = api.createBox(world, { size: 1 })
    const b = api.createBox(world, { size: 1 })
    api.setPosition(a, 0.3, 0, 0)
    api.setPosition(b, 0, 0, 0)
    api.resolveCollision(a, b)
    expect(Math.abs(a.position.x)).toBeCloseTo(1, 1) // empurrado no eixo de menor penetração
  })
})

describe('gameThreeDRuntime — ciclo de vida de listeners por mundo', () => {
  it('remove o listener de grade ao descartar o mundo', () => {
    const { api, listenerCount } = loadRuntime()
    const world = api.createScene('tela')
    const player = api.createBox(world, { size: 1 })
    const baseline = listenerCount('keydown')
    api.gridStep(player)
    expect(listenerCount('keydown')).toBe(baseline + 1)
    api.dispose(world)
    expect(listenerCount('keydown')).toBe(baseline)
  })
})
// lookAtObject/lookAtPoint/moveForward/faceVelocity usam THREE.lookAt/getWorldDirection
// (matemática de matriz) — verificados no browser real (o fake de THREE não os reproduz).

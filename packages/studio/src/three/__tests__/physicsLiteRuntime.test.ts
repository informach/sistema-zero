import { describe, expect, it } from 'bun:test'
import { physicsLiteRuntimeSource } from '../physicsLiteRuntime'

interface PositionLike {
  x: number
  y: number
  z: number
}

interface Object3DLike {
  position: PositionLike
  rotation: PositionLike
}

interface PhysicsBodySnapshot extends PositionLike {
  grounded: boolean
  vx: number
  vy: number
  vz: number
}

interface RayHit {
  id: string
  distance: number
}

interface PhysicsWorld {
  addBody(id: string, object: Object3DLike, options?: Record<string, unknown>): void
  addStaticBox(
    id: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
  ): void
  addTrigger(
    id: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
  ): void
  clear(): void
  impulse(id: string, x: number, y: number, z: number): boolean
  remove(id: string): boolean
  setVelocity(id: string, x: number, y: number, z: number): boolean
  teleport(id: string, x: number, y: number, z: number): boolean
  body(id: string): PhysicsBodySnapshot | null
  jump(id: string, speed: number): boolean
  moveCharacter(id: string, x: number, z: number, speed: number): void
  onCollision(listener: (bodyId: string, colliderId: string) => void): () => void
  onTrigger(listener: (bodyId: string, triggerId: string, entering: boolean) => void): () => void
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDistance: number,
  ): RayHit | null
  step(dt: number): void
}

type PhysicsFactory = (options?: Record<string, unknown>) => PhysicsWorld

function isPhysicsFactory(value: unknown): value is PhysicsFactory {
  return typeof value === 'function'
}

function loadFactory(): PhysicsFactory {
  const candidate: unknown = new Function(
    `${physicsLiteRuntimeSource}\nreturn createSZPhysicsLite;`,
  )()
  if (!isPhysicsFactory(candidate)) throw new Error('createSZPhysicsLite não foi definido')
  return candidate
}

function objectAt(x: number, y: number, z: number): Object3DLike {
  return { position: { x, y, z }, rotation: { x: 0, y: 0, z: 0 } }
}

describe('SZ Physics Lite runtime', () => {
  it('integra em passo fixo e mantém o corpo acima do chão analítico', () => {
    const physics = loadFactory()({ groundHeight: () => 2 })
    const object = objectAt(0, 8, 0)
    physics.addBody('caixa', object, { width: 2, height: 2, depth: 2 })

    for (let frame = 0; frame < 180; frame += 1) physics.step(1 / 60)

    expect(object.position.y).toBeCloseTo(3, 5)
    expect(physics.body('caixa')?.grounded).toBe(true)
  })

  it('resolve caixa estática e publica a colisão real', () => {
    const physics = loadFactory()({ gravity: 0 })
    const object = objectAt(-2.2, 1, 0)
    const collisions: string[] = []
    physics.addBody('jogador', object, { kind: 'character', width: 1, height: 2, depth: 1 })
    physics.addStaticBox('parede', 0, 1, 0, 2, 2, 4)
    physics.onCollision((bodyId, colliderId) => collisions.push(`${bodyId}:${colliderId}`))
    physics.moveCharacter('jogador', 1, 0, 8)

    for (let frame = 0; frame < 60; frame += 1) physics.step(1 / 60)

    expect(object.position.x).toBeLessThanOrEqual(-1.49)
    expect(collisions).toContain('jogador:parede')
    expect(collisions.filter((collision) => collision === 'jogador:parede')).toHaveLength(1)
  })

  it('emite entrada e saída de gatilho sem repetir entrada a cada quadro', () => {
    const physics = loadFactory()({ gravity: 0 })
    const object = objectAt(-3, 1, 0)
    const events: string[] = []
    physics.addBody('jogador', object, { kind: 'character', width: 1, height: 2, depth: 1 })
    physics.addTrigger('praca', 0, 1, 0, 2, 2, 2)
    physics.onTrigger((bodyId, triggerId, entering) => {
      events.push(`${bodyId}:${triggerId}:${entering ? 'entrou' : 'saiu'}`)
    })

    physics.moveCharacter('jogador', 1, 0, 6)
    for (let frame = 0; frame < 40; frame += 1) physics.step(1 / 60)
    physics.moveCharacter('jogador', 1, 0, 6)
    for (let frame = 0; frame < 40; frame += 1) physics.step(1 / 60)

    expect(events.filter((event) => event.endsWith('entrou'))).toHaveLength(1)
    expect(events.filter((event) => event.endsWith('saiu'))).toHaveLength(1)
  })

  it('oferece salto de personagem e raycast no colisor mais próximo', () => {
    const physics = loadFactory()({ groundHeight: () => 0 })
    const object = objectAt(0, 1, 0)
    physics.addBody('jogador', object, { kind: 'character', width: 1, height: 2, depth: 1 })
    physics.addStaticBox('longe', 0, 1, -8, 2, 2, 2)
    physics.addStaticBox('perto', 0, 1, -4, 2, 2, 2)
    physics.step(1 / 60)

    expect(physics.jump('jogador', 7)).toBe(true)
    physics.step(1 / 60)
    expect(object.position.y).toBeGreaterThan(1)
    expect(physics.raycast(0, 1, 0, 0, 0, -1, 20)?.id).toBe('perto')
  })

  it('personagem empurra corpos dinâmicos usando broadphase da grade', () => {
    const physics = loadFactory()({ gravity: 0 })
    const player = objectAt(-2, 1, 0)
    const crate = objectAt(0, 1, 0)
    physics.addBody('jogador', player, { kind: 'character', width: 1, height: 1, depth: 1 })
    physics.addBody('caixa', crate, { kind: 'dynamic', width: 1, height: 1, depth: 1 })
    physics.moveCharacter('jogador', 1, 0, 8)

    for (let frame = 0; frame < 60; frame += 1) physics.step(1 / 60)

    expect(crate.position.x).toBeGreaterThan(0.5)
    expect(player.position.x).toBeLessThan(crate.position.x)
  })

  it('produz o mesmo deslocamento com 60 ou 120 chamadas por segundo', () => {
    const at60 = loadFactory()({ gravity: 0 })
    const at120 = loadFactory()({ gravity: 0 })
    const object60 = objectAt(0, 2, 0)
    const object120 = objectAt(0, 2, 0)
    at60.addBody('jogador', object60, { kind: 'character' })
    at120.addBody('jogador', object120, { kind: 'character' })
    at60.moveCharacter('jogador', 1, 0, 6)
    at120.moveCharacter('jogador', 1, 0, 6)

    for (let frame = 0; frame < 60; frame += 1) at60.step(1 / 60)
    for (let frame = 0; frame < 120; frame += 1) at120.step(1 / 120)

    expect(object120.position.x).toBeCloseTo(object60.position.x, 5)
  })

  it('usa micro-passos para não atravessar uma parede fina em alta velocidade', () => {
    const physics = loadFactory()({ gravity: 0, maxSpeed: 120 })
    const object = objectAt(-2, 1, 0)
    physics.addBody('projetil', object, { width: 0.5, height: 0.5, depth: 0.5 })
    physics.addStaticBox('paredeFina', 0, 1, 0, 0.1, 4, 4)
    physics.setVelocity('projetil', 120, 0, 0)

    physics.step(1 / 60)

    expect(object.position.x).toBeLessThanOrEqual(-0.29)
  })

  it('limita entidades, remove qualquer tipo e permite cancelar listeners', () => {
    const physics = loadFactory()({ gravity: 0, maxBodies: 1 })
    const collisions: string[] = []
    const stop = physics.onCollision((a, b) => collisions.push(`${a}:${b}`))
    stop()
    physics.addBody('um', objectAt(-2, 1, 0), { kind: 'character' })
    expect(() => physics.addBody('dois', objectAt(2, 1, 0))).toThrow('Limite de corpos')
    physics.addStaticBox('parede', 0, 1, 0, 1, 2, 2)
    expect(physics.remove('parede')).toBe(true)
    expect(physics.raycast(-2, 1, 0, 1, 0, 0, 10)).toBeNull()
    expect(collisions).toEqual([])
  })

  it('não inclui Rapier, WASM ou dependência externa', () => {
    expect(physicsLiteRuntimeSource).not.toContain('Rapier')
    expect(physicsLiteRuntimeSource).not.toContain('WebAssembly')
    expect(physicsLiteRuntimeSource).not.toContain('import ')
  })

  it('rejeita nomes que poderiam alterar o protótipo dos índices internos', () => {
    const physics = loadFactory()()
    const object = objectAt(0, 1, 0)

    expect(() => physics.addBody('__proto__', object)).toThrow('Nome reservado')
    expect(() => physics.addStaticBox('constructor', 0, 0, 0, 1, 1, 1)).toThrow('Nome reservado')
  })
})

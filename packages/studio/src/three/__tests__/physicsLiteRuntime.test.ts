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
  body(id: string): PhysicsBodySnapshot | null
  jump(id: string, speed: number): boolean
  moveCharacter(id: string, x: number, z: number, speed: number): void
  onCollision(listener: (bodyId: string, colliderId: string) => void): void
  onTrigger(listener: (bodyId: string, triggerId: string, entering: boolean) => void): void
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

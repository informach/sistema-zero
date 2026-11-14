import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { createMoradaHouse } from '@sistemazero/avatar-quarto/morada/catalog'
import { findMoradaSpawn, MORADA_BODY, moradaCapsuleFree } from '../src/mundo/morada-chegada'
import { moradaAccess } from '../src/sistemas/morada'

const require = createRequire(import.meta.url)
const R = (
  await import(
    require.resolve('@dimforge/rapier3d-compat', {
      paths: [require.resolve('@react-three/rapier')],
    })
  )
).default
beforeAll(() => R.init())

test('chegada real rejeita colisão por malha, caixas e o próprio corpo não é obstáculo', () => {
  const world = new R.World({ x: 0, y: -18, z: 0 })
  try {
    const vertices = Float32Array.from([-2, 0, 4, 2, 0, 4, -2, 3, 4, 2, 3, 4])
    world.createCollider(R.ColliderDesc.trimesh(vertices, Uint32Array.from([0, 1, 2, 2, 1, 3])))
    const own = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        MORADA_BODY.centerToFoot + 0.06,
        5,
      ),
    )
    world.createCollider(R.ColliderDesc.capsule(MORADA_BODY.halfHeight, MORADA_BODY.radius), own)
    world.step()
    const free = (p: [number, number, number]) => moradaCapsuleFree(world, R, p, own.handle)
    expect(free([0, MORADA_BODY.centerToFoot + 0.06, 4])).toBe(false)
    expect(free([0, MORADA_BODY.centerToFoot + 0.06, 5])).toBe(true)
    const result = findMoradaSpawn(createMoradaHouse(), free)!
    expect(result).not.toBeNull()
    expect(free(result)).toBe(true)
    expect(result[2]).not.toBe(4)
  } finally {
    world.free()
  }
})
test('varredura encontra chegada fora das quatro linhas antigas e respeita lotes pequenos', () => {
  const h = createMoradaHouse()
  expect(findMoradaSpawn(h, (p) => p[0] === 1 && p[2] === 5)).toEqual([
    1,
    MORADA_BODY.centerToFoot + 0.06,
    5,
  ])
  h.lot.size = [2, 2]
  const p = findMoradaSpawn(h, (p) => p[0] === 0.5 && p[2] === -0.5)!
  expect(p).toEqual([0.5, MORADA_BODY.centerToFoot + 0.06, -0.5])
  expect(findMoradaSpawn(h, () => false)).toBeNull()
})
test('acesso recusa um quarto fechado por paredes reais que só têm colisão por malha', () => {
  const h = createMoradaHouse()
  h.rooms[0]!.size = [4, 4]
  const pieceId = 'moveis/natal/parede_biscoito_lateral_janela_pacote'
  h.instances = [
    { id: 'fundo', pieceId, position: [0, 0, -2], rotation: 0 },
    { id: 'frente', pieceId, position: [0, 0, 2], rotation: 0 },
    { id: 'esquerda', pieceId, position: [-2, 0, 0], rotation: Math.PI / 2 },
    { id: 'direita', pieceId, position: [2, 0, 0], rotation: Math.PI / 2 },
  ]
  expect(moradaAccess(h)).toBe(false)
  expect(moradaAccess({ ...h, instances: h.instances.filter((i) => i.id !== 'frente') })).toBe(true)
})

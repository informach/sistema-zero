import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { createMoradaHouse, MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { adotar } from '../src/sistemas/bichos'
import { quemAcompanha } from '../src/sistemas/companhia'
import { CORPO } from '../src/sistemas/corpo'
import { capsulaDoEspaco } from '../src/sistemas/espaco-dos-bichos'
import {
  animacaoDoPetPausada,
  criarPetMorada,
  passoDoPetMorada,
  petDaMorada,
} from '../src/sistemas/pet-morada'

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
beforeAll(async () => {
  await R.init()
})

test('remoção e troca do pet canônico decidem a mesma companhia para todos os bichos', () => {
  const house = createMoradaHouse()
  const original = criarSalvamentoInicial(new Date('2026-11-14T12:00:00Z'))
  const bichos = adotar({ ...original.bichos, achados: ['gato'] }, 'gato', 'Mingau')!
  const save = { ...original, bichos, companhia: 'quarto' as const }
  const quarto = { house, pet: 'pets/doberman' }
  house.pet = null
  expect(petDaMorada(quarto)).toBeNull()
  expect(quemAcompanha(save, petDaMorada(quarto))).toBe('adotado')
  house.pet = 'pets/gato'
  expect(petDaMorada(quarto)).toBe('pets/gato')
  expect(quemAcompanha(save, petDaMorada(quarto))).toBe('quarto')
  house.pet = null
  expect(quemAcompanha(save, petDaMorada(quarto))).toBe('adotado')
  expect(petDaMorada({ pet: 'pets/doberman' })).toBeNull()
})

test('menos movimento desliga idle; passos essenciais continuam e a pausa congela tudo', () => {
  for (const [device, game] of [
    [true, false],
    [false, true],
    [true, true],
  ]) {
    expect(animacaoDoPetPausada(false, 0, device!, game!)).toBe(true)
    expect(animacaoDoPetPausada(false, 1, device!, game!)).toBe(false)
  }
  expect(animacaoDoPetPausada(false, 0, false, false)).toBe(false)
  expect(animacaoDoPetPausada(true, 1, false, false)).toBe(true)
  const pet = criarPetMorada({ x: 0, y: 0, z: 0 })
  const before = structuredClone(pet)
  passoDoPetMorada(pet, {
    child: { x: 8, z: 0, pe: 0, direcao: 0 },
    pedido: { x: 1, z: 0 },
    radius: 0.3,
    dt: 1 / 60,
    paused: true,
    waiting: false,
    grounded: true,
  })
  expect(pet).toEqual(before)
})

test('no corredor estreito, o pet avança para dar passagem; na saída cede o lado livre', () => {
  const world = new R.World({ x: 0, y: 0, z: 0 })
  const piece = MORADA_CATALOG.pieces['pets/doberman']!
  const cap = capsulaDoEspaco({
    raio: Math.max(piece.size[0] / 2, piece.size[2] * 0.3),
    altura: Math.max(0.75, piece.size[1]),
  })
  const pet = criarPetMorada({ x: 1, y: 0, z: 0 })
  const body = world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(1, cap.y, 0),
  )
  const col = world.createCollider(R.ColliderDesc.capsule(cap.meiaAltura, cap.raio), body)
  // Um corredor de 1,1 m não comporta ambos lado a lado. Depois de x=3 há espaço para ceder.
  for (const z of [-0.65, 0.65])
    world.createCollider(R.ColliderDesc.cuboid(2.5, 1, 0.1).setTranslation(0.5, 1, z))
  const child = world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 0),
  )
  const childCol = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), child)
  const kcc = world.createCharacterController(0.01)
  const shape = new R.Capsule(cap.meiaAltura, cap.raio)
  const dt = 1 / 60
  let minimum = Infinity
  let maximumSide = 0
  try {
    world.step()
    for (let i = 0; i < 420; i++) {
      kcc.computeColliderMovement(childCol, { x: 1.8 * dt, y: 0, z: 0 })
      const p = child.translation(),
        movement = kcc.computedMovement()
      child.setNextKinematicTranslation({ x: p.x + movement.x, y: p.y, z: p.z + movement.z })
      passoDoPetMorada(pet, {
        child: { x: p.x, z: p.z, pe: 0, direcao: Math.PI / 2 },
        pedido: { x: 1, z: 0 },
        radius: cap.raio,
        dt,
        paused: false,
        waiting: false,
        grounded: true,
        livre: (x, z) =>
          world.intersectionWithShape(
            { x, y: cap.y + 0.01, z },
            { x: 0, y: 0, z: 0, w: 1 },
            shape,
            R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            col,
          ) === null,
      })
      body.setNextKinematicTranslation({ x: pet.position.x, y: cap.y, z: pet.position.z })
      world.step()
      minimum = Math.min(
        minimum,
        Math.hypot(child.translation().x - pet.position.x, child.translation().z - pet.position.z),
      )
      maximumSide = Math.max(maximumSide, Math.abs(pet.position.z))
      if (pet.position.x < 3) expect(Math.abs(pet.position.z) + cap.raio).toBeLessThanOrEqual(0.56)
    }
    expect(child.translation().x).toBeGreaterThan(4)
    expect(maximumSide).toBeGreaterThan(0.5)
    expect(minimum).toBeGreaterThan(CORPO.raio + cap.raio - 0.03)
  } finally {
    world.free()
  }
})

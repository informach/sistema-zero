import { expect, test } from 'bun:test'
import { createMoradaHouse, MORADA_CATALOG, MoradaHouseSchema } from '@sistemazero/core/morada'
import {
  type MoradaPetWalk,
  moradaPetArea,
  moradaPetBlocked,
  stepMoradaPet,
} from '../src/morada/pet-walk'

test('pet passeia na escala nativa, desvia dos móveis e permanece dentro do cômodo', () => {
  const house = createMoradaHouse()
  house.pet = 'pets/doberman'
  const area = moradaPetArea(house, MORADA_CATALOG)
  const state: MoradaPetWalk = { x: 0, z: 0, heading: Math.PI / 2, elapsed: 0, walking: false }
  let walked = 0,
    rested = 0
  for (let i = 0; i < 1200; i++) {
    stepMoradaPet(state, area, 1 / 60)
    expect(moradaPetBlocked(state.x, state.z, area)).toBe(false)
    if (state.walking) walked++
    else rested++
  }
  expect(walked).toBeGreaterThan(100)
  expect(rested).toBeGreaterThan(100)
})

test('o clima é persistido por cômodo e rejeita ids desconhecidos', () => {
  const house = createMoradaHouse()
  const room = house.rooms[0]
  if (!room) throw new Error('Falta o quarto')
  room.lighting = 'neon-ciano'
  expect(MoradaHouseSchema.parse(house).rooms[0]?.lighting).toBe('neon-ciano')
  expect(
    MoradaHouseSchema.safeParse({ ...house, rooms: [{ ...room, lighting: 'qualquer' }] }).success,
  ).toBe(false)
})

test('menos movimento e pausa congelam a trajetória decorativa inteira, sem deriva ao retomar', () => {
  const house = createMoradaHouse()
  house.pet = 'pets/gato'
  const area = moradaPetArea(house, MORADA_CATALOG)
  const state: MoradaPetWalk = { x: 0, z: 0, heading: 0, elapsed: 0, walking: false }
  stepMoradaPet(state, area, 1 / 60)
  const before = { ...state }
  for (let i = 0; i < 120; i++) {
    stepMoradaPet(state, area, 1 / 60, { reducedMotion: true })
    expect(state).toEqual(before)
    stepMoradaPet(state, area, 1 / 60, { paused: true })
    expect(state).toEqual(before)
  }
  stepMoradaPet(state, area, 1 / 60)
  expect(Math.hypot(state.x - before.x, state.z - before.z)).toBeCloseTo(0.65 / 60, 6)
})

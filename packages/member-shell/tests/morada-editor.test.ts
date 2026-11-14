import { expect, test } from 'bun:test'
import {
  createMoradaHouse,
  MORADA_CATALOG,
  type MoradaInstance,
  validateMoradaHouse,
} from '@sistemazero/core/morada'
import {
  moradaFitsRoom,
  moradaSurfaceOptions,
  removeMoradaInstance,
  replaceMoradaRoom,
} from '../src/components/cosmetics/room/morada-editor-model'

test('reaplicar o quarto sobre a revisão atual preserva a construção fora dele', () => {
  const current = createMoradaHouse()
  const garden: MoradaInstance = {
    id: 'jardim',
    pieceId: 'construcao/pisante',
    position: [8, 0, 0],
    rotation: 0,
  }
  current.instances.push(garden)
  const draft = structuredClone(current)
  draft.instances = draft.instances.filter((i) => i.id !== 'cadeira-inicial')
  draft.lot.size = [12, 12]
  const actual = replaceMoradaRoom(current, draft)
  expect(actual.instances).toContain(garden)
  expect(actual.lot).toBe(current.lot)
  expect(actual.instances.some((i) => i.id === 'cadeira-inicial')).toBe(false)
})

test('retirar uma estante retira somente os seus filhos, mesmo com duas estantes iguais', () => {
  const house = createMoradaHouse()
  const base = house.instances[0]
  if (!base) throw new Error('Falta o chão inicial')
  house.instances.push(
    { ...base, id: 'estante-1' },
    { ...base, id: 'estante-2' },
    { ...base, id: 'trofeu-1', parentId: 'estante-1', slotId: 'a' },
    { ...base, id: 'trofeu-2', parentId: 'estante-2', slotId: 'a' },
  )
  const next = removeMoradaInstance(house, 'estante-1')
  expect(next.instances.some((i) => i.id === 'trofeu-1')).toBe(false)
  expect(next.instances.some((i) => i.id === 'trofeu-2')).toBe(true)
})

test('limite do quarto considera a caixa real após a rotação', () => {
  const house = createMoradaHouse()
  const bed = house.instances.find((i) => i.id === 'cama-inicial')
  if (!bed) throw new Error('Falta a cama Morada')
  expect(moradaFitsRoom(house, bed)).toBe(true)
  expect(moradaFitsRoom(house, { ...bed, position: [4, 0, 3], rotation: Math.PI / 2 })).toBe(false)
})

test('as opções de apoio não oferecem uma instância descendente nem um slot ocupado', () => {
  const house = createMoradaHouse()
  const shelf = Object.values(MORADA_CATALOG.pieces).find((p) =>
    p.slots.some((s) => s.size.every((v) => v > 0.1)),
  )
  const small = Object.values(MORADA_CATALOG.pieces).find(
    (p) => p.kind === 'furniture' && p.size.every((v) => v < 0.05),
  )
  if (!shelf || !small) throw new Error('A biblioteca precisa de prateleira e objeto pequeno')
  const parent: MoradaInstance = {
    id: 'pai',
    roomId: house.roomId,
    pieceId: shelf.id,
    position: [0, 0, 0],
    rotation: 0,
  }
  const child: MoradaInstance = {
    id: 'filho',
    roomId: house.roomId,
    pieceId: small.id,
    position: [0, 0, 0],
    rotation: 0,
  }
  house.instances = [parent, child]
  const options = moradaSurfaceOptions(house, child)
  expect(options.every((o) => o.parent.id !== child.id)).toBe(true)
  expect(options.some((o) => o.parent.id === parent.id)).toBe(true)
})

test('oferece o encaixe que cabe na orientação escolhida, conservando a rotação', () => {
  const house = createMoradaHouse()
  const child: MoradaInstance = {
    id: 'prateleira',
    roomId: house.roomId,
    pieceId: 'moveis/banheiro/prateleira_madeira_escura',
    position: [0, 0, 0],
    rotation: Math.PI / 2,
  }
  house.instances = [
    {
      id: 'armario',
      roomId: house.roomId,
      pieceId: 'moveis/armarios/guarda_roupa_correr_espelho_verde',
      position: [0, 0, 0],
      rotation: 0,
    },
    child,
  ]
  const placed = { ...child, parentId: 'armario', slotId: 'slot_aberta_1' }
  expect(validateMoradaHouse({ ...house, instances: [house.instances[0]!, placed] })).toEqual([])
  expect(moradaSurfaceOptions(house, child).some((o) => o.slot.id === placed.slotId)).toBe(true)
  expect(
    moradaSurfaceOptions(house, { ...child, rotation: 0 }).some((o) => o.slot.id === placed.slotId),
  ).toBe(false)
})

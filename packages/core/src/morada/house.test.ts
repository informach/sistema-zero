import { describe, expect, test } from 'bun:test'
import { MORADA_CATALOG } from './catalog.generated'
import { createMoradaHouse, reconcileMoradaHouse, validateMoradaHouse } from './house'
import { MoradaHouseSchema } from './schema'
import type { MoradaCatalog, MoradaHouse, MoradaPiece } from './types'

const shelf: MoradaPiece = {
  id: 'shelf',
  label: 'Estante',
  category: 'estantes',
  kind: 'furniture',
  group: 'shelf',
  file: '',
  thumb: '',
  size: [1, 1, 1],
  min: [-0.5, 0, -0.5],
  max: [0.5, 1, 0.5],
  mount: 'floor',
  colliders: [],
  collisionMeshes: [],
  slots: [{ id: 'nicho', center: [0, 0.5, 0], size: [0.5, 0.5, 0.5] }],
  interactions: [],
  materials: [],
  colors: [],
  tags: [],
  triangles: 12,
  animations: [],
  points: {},
}
const small = {
  ...shelf,
  id: 'objeto',
  size: [0.2, 0.2, 0.2] as [number, number, number],
  min: [-0.1, 0, -0.1] as [number, number, number],
  max: [0.1, 0.2, 0.1] as [number, number, number],
}
const catalog: MoradaCatalog = { ...MORADA_CATALOG, pieces: { shelf, objeto: small } }
const emptyHouse = (): MoradaHouse => ({ ...createMoradaHouse(), instances: [] })

describe('documento da casa Morada', () => {
  test('catálogo atualizado omite recurso retirado e órfãos transitivos, mantendo os demais e os marcadores', () => {
    const house = emptyHouse()
    house.migrations = ['arquipelago-functions-v1']
    house.instances = [
      { id: 'preservado', pieceId: 'shelf', position: [-2, 0, 0], rotation: 0, roomId: 'quarto' },
      {
        id: 'retirado',
        pieceId: 'modelo-antigo',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
      },
      {
        id: 'filho',
        pieceId: 'objeto',
        parentId: 'retirado',
        slotId: 'nicho',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
      },
      {
        id: 'neto',
        pieceId: 'objeto',
        parentId: 'filho',
        slotId: 'nicho',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
      },
      {
        id: 'solto',
        pieceId: 'objeto',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
        materials: { cor: { texture: 'textura-antiga', color: '#123456' } },
      },
    ]
    house.pet = 'pet-antigo'
    const read = reconcileMoradaHouse(house, catalog)
    expect(read.instances.map((i) => i.id)).toEqual(['preservado', 'solto'])
    expect(read.instances[1]?.materials?.cor).toEqual({ color: '#123456' })
    expect(read.pet).toBeNull()
    expect(read.migrations).toEqual(['arquipelago-functions-v1'])
    expect(house.instances).toHaveLength(5)
    expect(house.pet).toBe('pet-antigo')
    expect(validateMoradaHouse(read, catalog)).toEqual([])
    expect(() => reconcileMoradaHouse({ ...house, rooms: [] }, catalog)).toThrow()
  })
  test('slot retirado deixa somente o móvel, sem deslocar objetos para outro nicho', () => {
    const house = emptyHouse()
    house.instances = [
      { id: 'pai', pieceId: 'shelf', position: [0, 0, 0], rotation: 0, roomId: 'quarto' },
      {
        id: 'filho',
        pieceId: 'objeto',
        parentId: 'pai',
        slotId: 'nicho',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
      },
    ]
    expect(
      reconcileMoradaHouse(house, {
        ...catalog,
        pieces: { ...catalog.pieces, shelf: { ...shelf, slots: [] } },
      }).instances.map((i) => i.id),
    ).toEqual(['pai'])
  })
  test('começa em escala nativa com piso8x6, vãos e móveis reais', () => {
    const house = createMoradaHouse()
    expect(house.instances.length).toBeGreaterThan(10)
    expect(validateMoradaHouse(house)).toEqual([])
    const floor = house.instances.find((i) => i.id === 'piso-esq-fundo')!
    expect(floor.position[1] + MORADA_CATALOG.pieces[floor.pieceId]!.max[1]).toBe(0)
  })
  test('dois móveis iguais têm nichos independentes por instância', () => {
    const house = emptyHouse()
    house.instances = [
      { id: 'estante1', pieceId: 'shelf', position: [-2, 0, 0], rotation: 0, roomId: 'quarto' },
      { id: 'estante2', pieceId: 'shelf', position: [2, 0, 0], rotation: 0, roomId: 'quarto' },
      {
        id: 'objeto1',
        pieceId: 'objeto',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
        parentId: 'estante1',
        slotId: 'nicho',
      },
      {
        id: 'objeto2',
        pieceId: 'objeto',
        position: [0, 0, 0],
        rotation: 0,
        roomId: 'quarto',
        parentId: 'estante2',
        slotId: 'nicho',
      },
    ]
    expect(validateMoradaHouse(house, catalog)).toEqual([])
    house.instances[3]!.parentId = 'estante1'
    expect(validateMoradaHouse(house, catalog).some((error) => error.includes('ocupado'))).toBe(
      true,
    )
  })
  test('recusa ciclos, referências inexistentes, peça fora do lote e formato futuro', () => {
    const house = emptyHouse()
    house.instances = [
      { id: 'a', pieceId: 'shelf', position: [100, 0, 0], rotation: 0 },
      {
        id: 'b',
        pieceId: 'objeto',
        position: [0, 0, 0],
        rotation: 0,
        parentId: 'b',
        slotId: 'nicho',
      },
    ]
    expect(validateMoradaHouse(house, catalog).some((error) => error.includes('ciclo'))).toBe(true)
    expect(validateMoradaHouse(house, catalog).some((error) => error.includes('fora'))).toBe(true)
    house.instances[0]!.pieceId = 'nao-existe'
    expect(
      validateMoradaHouse(house, catalog).some((error) => error.includes('desconhecida')),
    ).toBe(true)
    expect(MoradaHouseSchema.safeParse({ ...house, version: 2 }).success).toBe(false)
  })
  test('limite de peças não trunca a construção', () => {
    const house = emptyHouse()
    house.instances = Array.from({ length: 601 }, (_, i) => ({
      id: `i${i}`,
      pieceId: 'shelf',
      position: [0, 0, 0],
      rotation: 0,
    }))
    expect(MoradaHouseSchema.safeParse(house).success).toBe(false)
  })
})

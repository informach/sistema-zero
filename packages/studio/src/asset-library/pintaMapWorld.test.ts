import { expect, test } from 'bun:test'
import { type PintaSceneObject, PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import type { PersonalAsset } from './personal'
import { pintaMapWorld, pintaWorldNeedsInventory } from './pintaMapWorld'

const PNG = 'data:image/png;base64,AAAA'
const door = (destination: string | number): PintaSceneObject => ({
  id: 'door',
  name: 'Porta',
  type: '',
  role: 'door',
  x: 0,
  y: 0,
  width: 16,
  height: 16,
  properties: { destino: destination },
})
function map(
  id: string,
  destination?: string,
): PersonalAsset & { scene: NonNullable<PersonalAsset['scene']> } {
  return {
    id,
    name: id,
    kind: 'image',
    dataUrl: PNG,
    updatedAt: 7,
    scene: PintaSceneSchema.parse({
      version: 2,
      id,
      name: id,
      tileSize: 16,
      cols: 1,
      rows: 1,
      tilesets: [
        { id: 'ts', name: 'Peças', image: PNG, count: 1, columns: 1, solid: [], platform: [] },
      ],
      layers: [
        {
          id: 'objects',
          kind: 'objects',
          name: 'Objetos',
          visible: true,
          objects: destination ? [door(destination)] : [],
        },
      ],
    }),
  }
}

test('o catálogo só é necessário para vínculos externos, incluindo nomes e IDs próprios', () => {
  const root = map('vila')
  expect(pintaWorldNeedsInventory(root)).toBe(false)
  expect(pintaWorldNeedsInventory(map('vila', 'vila'))).toBe(false)
  expect(pintaWorldNeedsInventory(map('vila', 'cabana'))).toBe(true)
  expect(pintaMapWorld(root, []).maps).toBeUndefined()
})

test('IDs precedem nomes; ciclos e referências repetidas incluem cada mapa uma vez', () => {
  const root = map('vila', 'cabana'),
    child = map('cabana', 'vila'),
    unrelated = map('outro')
  unrelated.name = 'cabana'
  const result = pintaMapWorld(root, [child, unrelated])
  expect([result.id, ...result.maps!.map((a) => a.id)]).toEqual(['vila', 'cabana'])
  expect(result.maps![0]).toMatchObject({ scene: child.scene, libRevision: 7 })
  expect(root.scene.layers[0]).toMatchObject({ objects: [door('cabana')] })
})

test('portas ocultas e portas dentro de conjuntos continuam fazendo parte do mundo', () => {
  const root = map('vila', 'oculto')
  root.scene.layers[0]!.visible = false
  root.scene.sets = [
    {
      id: 'casa',
      cols: 1,
      rows: 1,
      layers: [
        { id: 'doors', kind: 'objects', name: 'Portas', visible: true, objects: [door('jardim')] },
      ],
    },
  ]
  expect(pintaMapWorld(root, [map('oculto'), map('jardim')]).maps!.map((a) => a.id)).toEqual([
    'oculto',
    'jardim',
  ])
})

test('propriedades tipadas de camada, objeto e peça incluem mapas, sem extrair imagens embutidas', () => {
  const root = map('vila')
  root.scene.layers[0]!.properties = {
    ir: { type: 'asset', value: 'camada' },
    arte: { type: 'asset', value: 'ts' },
  }
  const objects = root.scene.layers[0]
  if (objects?.kind !== 'objects') throw new Error('Fixture de objetos')
  objects.objects.push({
    ...door(''),
    role: 'trigger',
    properties: { ir: { type: 'asset', value: 'objeto' } },
  })
  root.scene.tilesets[0]!.tileProperties = { '0': { ir: { type: 'asset', value: 'peca' } } }
  const image: PersonalAsset = { id: 'ts', name: 'ts', kind: 'image', dataUrl: PNG, updatedAt: 7 }
  const result = pintaMapWorld(root, [map('camada'), map('objeto'), map('peca'), image])
  expect(result.maps!.map((a) => a.id)).toEqual(['camada', 'objeto', 'peca'])
  expect(result.scene).toEqual(root.scene)
})

test('nomes legados precisam identificar um único mapa e imagens comuns não são destinos', () => {
  const root = map('vila', 'Nome antigo'),
    child = map('cabana')
  child.scene.name = 'Nome antigo'
  expect(pintaMapWorld(root, [child]).maps![0]!.id).toBe('cabana')
  const other = map('outro')
  other.name = 'Nome antigo'
  expect(() => pintaMapWorld(root, [child, other])).toThrow('mais de um mapa')
  expect(() => pintaMapWorld(map('vila', 'perdido'), [])).toThrow('Falta o mapa')
  expect(() =>
    pintaMapWorld(map('vila', 'foto'), [
      { id: 'foto', name: 'foto', kind: 'image', dataUrl: PNG, updatedAt: 7 },
    ]),
  ).toThrow('não é um mapa')
})

test('uma porta sem configuração fica editável; configuração numérica é recusada', () => {
  const root = map('vila', '')
  expect(pintaMapWorld(root, []).maps).toBeUndefined()
  const layer = root.scene.layers[0]
  if (layer?.kind !== 'objects') throw new Error('Fixture de objetos')
  layer.objects = [door(12)]
  expect(() => pintaMapWorld(root, [])).toThrow('destino válido')
})

test('16 mapas cabem; o décimo sétimo recusa todo o fechamento', () => {
  const maps = Array.from({ length: 17 }, (_, i) => map(`m${i}`, i < 16 ? `m${i + 1}` : undefined))
  const atLimit = structuredClone(maps.slice(0, 16))
  atLimit[15]!.scene.layers = []
  expect(pintaMapWorld(atLimit[0]!, atLimit).maps).toHaveLength(15)
  expect(() => pintaMapWorld(maps[0]!, maps)).toThrow('16 mapas')
})

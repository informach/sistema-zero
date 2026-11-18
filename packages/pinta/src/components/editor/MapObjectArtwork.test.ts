import { expect, it } from 'bun:test'
import { createTilemapAsset, createTilesetAsset } from '../../core/project'
import { artworkImage } from './MapObjectArtwork'

it('a imagem de um desenho é montada uma vez e dividida por todos os objetos que o usam', async () => {
  const asset = createTilesetAsset({ name: 'arvore', tileSize: 16 })
  let builds = 0
  const build = (async () => {
    builds += 1
    return { id: 'x', name: 'arvore', dataUrl: 'data:image/png;base64,AA', width: 16, height: 16 }
  }) as unknown as Parameters<typeof artworkImage>[2]
  const [a, b, c] = await Promise.all([
    artworkImage(asset, () => null, build),
    artworkImage(asset, () => null, build),
    artworkImage(asset, () => null, build),
  ])
  expect(builds).toBe(1)
  expect(a).toEqual({ dataUrl: 'data:image/png;base64,AA', width: 16, height: 16 })
  expect(b).toBe(a)
  expect(c).toBe(a)
  // O desenho editado é outro objeto: a imagem é montada de novo.
  await artworkImage({ ...asset }, () => null, build)
  expect(builds).toBe(2)
})

it('desenho que não vira imagem devolve nada, sem quebrar', async () => {
  const asset = createTilesetAsset({ name: 'vazio', tileSize: 16 })
  const falha = (async () => {
    throw new Error('sem canvas')
  }) as unknown as Parameters<typeof artworkImage>[2]
  expect(await artworkImage(asset, () => null, falha)).toBeNull()
})

it('conjunto vivo acompanha dependências transitivas e uma folha que antes faltava', async () => {
  const leaf = createTilesetAsset({ name: 'folha antiga', tileSize: 16 })
  const map = createTilemapAsset({ name: 'casa', tilesetId: leaf.id, cols: 1, rows: 1 })
  const set = {
    id: 'set',
    kind: 'map-set' as const,
    schema: 4,
    name: 'casa',
    createdAt: 1,
    updatedAt: 1,
    map,
  }
  let builds = 0
  const build = (async (_map, find) => {
    builds++
    const dep = find(leaf.id)
    return dep ? { id: 'render', name: 'render', dataUrl: dep.name, width: 16, height: 16 } : null
  }) as Parameters<typeof artworkImage>[2]
  expect(await artworkImage(set, () => null, build)).toBeNull()
  const first = await artworkImage(set, () => leaf, build)
  expect(first?.dataUrl).toBe('folha antiga')
  expect(await artworkImage(set, () => leaf, build)).toBe(first)
  expect(builds).toBe(2)
  const updated = { ...leaf, name: 'folha nova' }
  expect((await artworkImage(set, () => updated, build))?.dataUrl).toBe('folha nova')
  expect(builds).toBe(3)
})

it('dependência de um conjunto dentro de outro também invalida a imagem compartilhada', async () => {
  const leaf = createTilesetAsset({ name: 'flor antiga', tileSize: 16 })
  const inner = {
    id: 'inner',
    kind: 'map-set' as const,
    schema: 4,
    name: 'Jardim',
    createdAt: 1,
    updatedAt: 1,
    map: createTilemapAsset({ name: 'Jardim', tilesetId: leaf.id, cols: 1, rows: 1 }),
  }
  const outerMap = createTilemapAsset({ name: 'Vila', tilesetId: 'outra-folha', cols: 1, rows: 1 })
  outerMap.layers.push({
    id: 'objetos',
    kind: 'objects',
    name: 'Jardins',
    visible: true,
    objects: [
      {
        id: 'instancia',
        name: 'jardim',
        type: '',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        properties: {},
        setId: inner.id,
      },
    ],
  })
  const outer = { ...inner, id: 'outer', map: outerMap }
  let builds = 0
  const build = (async (_map, find) => {
    builds++
    return { id: 'render', name: 'render', dataUrl: find(leaf.id)!.name, width: 16, height: 16 }
  }) as Parameters<typeof artworkImage>[2]
  const find = (current: typeof leaf) => (id: string) =>
    id === inner.id ? inner : id === leaf.id ? current : null
  expect((await artworkImage(outer, find(leaf), build))?.dataUrl).toBe('flor antiga')
  expect((await artworkImage(outer, find({ ...leaf, name: 'flor nova' }), build))?.dataUrl).toBe(
    'flor nova',
  )
  expect(builds).toBe(2)
})

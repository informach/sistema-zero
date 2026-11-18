import { expect, it } from 'bun:test'
import { createTilesetAsset } from '../../core/project'
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

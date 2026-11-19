import { expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import { envelopeVersionFor, galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { addMapObject, createMapObject } from '../tiles/mapObjects'
import { createMapSet } from '../tiles/sets'
import { addObjectLayer } from '../tiles/tilemapOps'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  PINTA_MAX_SCHEMA,
  sanitizePintaAsset,
} from './project'

function document() {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16, now: 100 })
  const map = createTilemapAsset({ name: 'vila', tilesetId: 'terra', cols: 2, rows: 2 })
  return {
    ...map,
    schema: 6,
    resources: [
      { sourceId: 'arvore-original', capturedAt: 200, asset: { ...sprite, id: 'versao-guardada' } },
    ],
  }
}

it('versão de arte embutida sobrevive ao documento, wire e backup, com proteção de formato 6', () => {
  const source = document()
  const read = sanitizePintaAsset(source)
  expect(read).toMatchObject({
    schema: 6,
    resources: [
      {
        sourceId: 'arvore-original',
        capturedAt: 200,
        asset: { id: 'versao-guardada', kind: 'pixel-sprite' },
      },
    ],
  })
  if (!read) throw new Error('O documento não abriu')
  expect(pintaAssetFromWire(pintaAssetToWire(read))).toEqual(read)
  expect(envelopeVersionFor([read])).toBe(6)
  expect(importPintaJson(galleryToPintaJson([read])).assets).toEqual([read])
})

it('catálogo inválido não é cortado: recusa todo o mapa sem perder referências', () => {
  const source = document(),
    version = source.resources[0]!
  for (const resources of [
    [version, version],
    [{ ...version, sourceId: '' }],
    [{ ...version, capturedAt: Number.NaN }],
    [{ ...version, asset: { ...version.asset, schema: 99 } }],
    [{ ...version, asset: source }],
    Array.from({ length: 33 }, (_, i) => ({
      ...version,
      asset: { ...version.asset, id: `v${i}` },
    })),
  ])
    expect(sanitizePintaAsset({ ...source, resources })).toBeNull()
  expect(sanitizePintaAsset({ ...source, schema: PINTA_MAX_SCHEMA + 1 })).toBeNull()
})

it('um conjunto com versões guardadas atravessa arquivo e transporte sem ser recusado', () => {
  const map = sanitizePintaAsset(document())
  if (map?.kind !== 'tilemap') throw new Error('Map expected')
  const set = createMapSet(map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'casa')
  const wire = pintaAssetToWire(set)
  expect(wire).toMatchObject({ schema: 6 })
  expect(pintaAssetFromWire(wire)).toEqual({ ...set, schema: 6, map: { ...set.map, schema: 6 } })
  expect(importPintaJson(galleryToPintaJson([set])).assets).toEqual([
    { ...set, schema: 6, map: { ...set.map, schema: 6 } },
  ])
})

it('animação específica é uma referência autoral, sem confundir com peça animada', () => {
  let map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'terra', cols: 2, rows: 2 }),
    'Árvores',
  )
  const layer = map.layers.at(-1)!
  map = addMapObject(
    map,
    layer.id,
    createMapObject({ shape: 'art', art: { assetId: 'arvore', animationId: 'vento' } }),
  )
  const read = sanitizePintaAsset(map)
  expect(read).toMatchObject({
    schema: 6,
    layers: [{}, { objects: [{ art: { assetId: 'arvore', animationId: 'vento' } }] }],
  })
  if (!read) throw new Error('O documento não abriu')
  expect(envelopeVersionFor([read])).toBe(6)
  expect(pintaAssetFromWire(pintaAssetToWire(read))).toEqual(read)
})

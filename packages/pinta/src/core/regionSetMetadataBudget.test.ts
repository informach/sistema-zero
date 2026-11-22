import { expect, spyOn, test } from 'bun:test'
import { metadataBudgetFixture } from '../../scripts/homologacao/metadataBudget'
import { prepareMapRegions } from '../tiles/regionMap'
import { createMapSet } from '../tiles/sets'
import { createTilemapAsset, sanitizeRegionMapSetAsset } from './project'
import { encodeRegionMapDocument } from './regionDocument'

test('set and inner map share the native metadata budget before chunk decoding', () => {
  const { border } = metadataBudgetFixture()
  const small = prepareMapRegions(
    createTilemapAsset({ name: 'base', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!small.ok) throw Error(small.reason)
  const set = createMapSet(small.map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'conjunto')
  const wire = encodeRegionMapDocument(border)
  expect(wire).not.toBeNull()
  const decode = spyOn(globalThis, 'atob')
  try {
    expect(sanitizeRegionMapSetAsset({ ...set, map: wire }) === null).toBe(true)
    expect(decode).not.toHaveBeenCalled()
  } finally {
    decode.mockRestore()
  }
})

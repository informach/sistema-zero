import { describe, expect, test } from 'bun:test'
import { assetFromJson, assetToJson } from '../export/assetJson'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { readMoldaDocument } from './documentReader'
import {
  assertMoldaDocumentWritable,
  checkMoldaDocumentVersion,
  MOLDA_DOCUMENT_VERSION,
  MOLDA_DOCUMENT_WRITE_VERSION,
  MOLDA_MAX_READ_VERSION,
} from './documentVersion'
import { sanitizeMoldaAsset } from './sanitize'

describe('native document versions', () => {
  test('capacidade de leitura e liberação de escrita permanecem explicitamente em v1', () => {
    expect(MOLDA_MAX_READ_VERSION).toBe(1)
    expect(MOLDA_DOCUMENT_WRITE_VERSION).toBe(1)
    expect(MOLDA_DOCUMENT_VERSION).toBe(MOLDA_DOCUMENT_WRITE_VERSION)
    for (const version of [2, 65535, Number.MAX_SAFE_INTEGER]) {
      expect(checkMoldaDocumentVersion({ formatVersion: version })).toEqual({
        status: 'unsupported',
        version,
      })
      expect(() => assertMoldaDocumentWritable({ formatVersion: version })).toThrow()
    }
  })
  test('legacy and versioned documents preserve identity, geometry, colors and pixels', () => {
    for (const asset of [makeModel(), makeTexture(), makeSky()]) {
      const original = structuredClone(asset)
      expect(readMoldaDocument(asset)).toMatchObject({ status: 'valid', asset, legacy: true })
      const wire = assetToJson(asset)
      expect(wire.formatVersion).toBe(MOLDA_DOCUMENT_VERSION)
      expect(readMoldaDocument(wire)).toMatchObject({ status: 'valid', asset, legacy: false })
      expect(asset).toEqual(original)
    }
  })

  test('future data is never sanitized into an older, incomplete document', () => {
    const raw = { ...assetToJson(makeModel()), formatVersion: 2, animations: [{ keys: [1, 2, 3] }] }
    const before = structuredClone(raw)
    const result = readMoldaDocument(raw)
    expect(result).toEqual({ status: 'unsupported', version: 2, raw })
    if (result.status === 'unsupported') expect(result.raw).toBe(raw)
    expect(assetFromJson(raw)).toBeNull()
    expect(sanitizeMoldaAsset(raw)).toBeNull()
    const newerInput = { ...makeModel(), formatVersion: 2 }
    expect(() => assetToJson(newerInput)).toThrow()
    expect(raw).toEqual(before)
  })

  test('malformed versions are invalid, not silently legacy', () => {
    for (const formatVersion of [0, -1, 1.5, null, '1', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(readMoldaDocument({ ...makeSky(), formatVersion }).status).toBe('invalid')
    }
    for (const raw of [null, [], 'no', { formatVersion: 1 }]) {
      expect(readMoldaDocument(raw).status).toBe('invalid')
    }
  })
})

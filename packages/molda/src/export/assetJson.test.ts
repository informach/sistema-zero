import { describe, expect, test } from 'bun:test'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { assetFromJson, assetToJson } from './assetJson'
import { GALLERY_FORMAT, GALLERY_VERSION, galleryToJsonText, importMoldaJson } from './projectJson'

describe('assetJson', () => {
  test('round-trip por JSON.stringify volta igual para os três tipos', () => {
    for (const asset of [makeModel(), makeTexture(), makeSky()]) {
      const text = JSON.stringify(assetToJson(asset))
      expect(text).not.toContain('Uint8Array')
      const back = assetFromJson(JSON.parse(text))
      expect(back).toEqual(asset)
    }
  })

  test('as peles vão como base64 (string), não como objeto {0:..,1:..}', () => {
    const json = assetToJson(makeModel()) as unknown as {
      parts: Array<{ faces: Record<string, { data: unknown }> }>
    }
    expect(typeof json.parts[0]?.faces.py?.data).toBe('string')
    const texture = assetToJson(makeTexture()) as unknown as { bitmap: { data: unknown } }
    expect(typeof texture.bitmap.data).toBe('string')
  })

  test('assetFromJson nunca lança', () => {
    expect(assetFromJson(undefined)).toBeNull()
    expect(
      assetFromJson({
        kind: 'texture',
        id: 'x',
        name: 'x',
        size: 16,
        bitmap: { width: 16, height: 16, data: 12 },
      }),
    ).toBeNull()
  })
})

describe('projectJson', () => {
  test('o writer emite molda-gallery v2 e o reader faz o round-trip', () => {
    const assets = [makeModel(), makeTexture(), makeSky()]
    const text = galleryToJsonText(assets, 123)
    const parsed = JSON.parse(text) as { format: string; version: number; exportedAt: number }
    expect(parsed.format).toBe(GALLERY_FORMAT)
    expect(parsed.version).toBe(2)
    expect(parsed.version).toBe(GALLERY_VERSION)
    expect(parsed.exportedAt).toBe(123)
    const result = importMoldaJson(text)
    expect(result?.skipped).toBe(0)
    expect(result?.assets).toEqual(assets)
  })

  test('o reader aceita v1 e v2, mas recusa versão ausente ou incompatível', () => {
    const envelope = JSON.parse(galleryToJsonText([makeSky()], 123)) as Record<string, unknown>
    for (const version of [1, 2]) {
      expect(importMoldaJson(JSON.stringify({ ...envelope, version }))?.assets).toEqual([makeSky()])
    }
    for (const version of [undefined, 0, 3, '1']) {
      const candidate = { ...envelope, version }
      expect(importMoldaJson(JSON.stringify(candidate))).toBeNull()
    }
  })

  test('registro ruim é contado, arquivo ruim é null, criação solta é aceita', () => {
    const text = JSON.stringify({
      format: GALLERY_FORMAT,
      version: 2,
      assets: [assetToJson(makeSky()), { kind: 'model' }, 5],
    })
    const result = importMoldaJson(text)
    expect(result?.assets).toHaveLength(1)
    expect(result?.skipped).toBe(2)
    expect(importMoldaJson('{')).toBeNull()
    expect(importMoldaJson('42')).toBeNull()
    expect(importMoldaJson(JSON.stringify({ format: GALLERY_FORMAT }))).toBeNull()
    expect(importMoldaJson(JSON.stringify({ hello: 'world' }))).toBeNull()
    const single = importMoldaJson(JSON.stringify(assetToJson(makeTexture())))
    expect(single?.assets[0]).toEqual(makeTexture())
  })
})

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
    const json = assetToJson(makeModel())
    expect(typeof json.parts[0]?.faces.py?.data).toBe('string')
    const texture = assetToJson(makeTexture())
    expect(typeof texture.bitmap.data).toBe('string')
  })

  test('o contrato nativo preserva a versão literal e estreita cada tipo de criação', () => {
    for (const asset of [makeModel(), makeTexture(), makeSky()]) {
      const json = assetToJson(asset)
      const version: 1 = json.formatVersion
      expect(version).toBe(1)
      switch (json.kind) {
        case 'model':
          expect(json.parts[0]?.faces.py?.data).toBeTypeOf('string')
          break
        case 'texture':
          expect(json.bitmap.data).toBeTypeOf('string')
          break
        case 'sky':
          expect(json.params.clouds).toBeDefined()
          break
        default: {
          const exhaustive: never = json
          throw new Error(`Tipo nativo não coberto: ${exhaustive}`)
        }
      }
    }
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

  test('arestas de construção persistem no JSON da nuvem/backup', () => {
    const model = makeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    part.shape = 'mesh'
    part.mesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0] },
      faces: {},
      looseEdges: [['v_a', 'v_b']],
    }
    const back = assetFromJson(JSON.parse(JSON.stringify(assetToJson(model))))
    expect(back?.kind === 'model' && back.parts[0]?.mesh?.looseEdges).toEqual([['v_a', 'v_b']])
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

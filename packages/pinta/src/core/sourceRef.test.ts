import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import { assetFromJson, assetToJson } from '../export/assetJson'
import { galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { cloneWithNewIds, planImport } from '../state/importPlan'
import { createTilesetAsset, sanitizePintaAsset, sanitizeSourceRef } from './project'

const ref = 'example-pygame:jogo/jogo-terreno'

describe('sourceRef — "this drawing is the copy of that document"', () => {
  it('a valid mark survives sanitize, wire, the single-asset JSON and the backup', () => {
    const asset = { ...createTilesetAsset({ name: 'terreno', tileSize: 16 }), sourceRef: ref }
    expect(sanitizePintaAsset(structuredClone(asset))?.sourceRef).toBe(ref)
    expect(pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(asset))))?.sourceRef).toBe(
      ref,
    )
    const single = assetFromJson(assetToJson(asset))
    expect(single.asset?.sourceRef).toBe(ref)
    expect(importPintaJson(galleryToPintaJson([asset])).assets[0]?.sourceRef).toBe(ref)
  })

  it('absent stays absent (old payloads byte-identical) and a malformed mark is dropped', () => {
    const plain = createTilesetAsset({ name: 'terreno', tileSize: 16 })
    const sanitized = sanitizePintaAsset(structuredClone(plain))!
    expect(Object.hasOwn(sanitized, 'sourceRef')).toBe(false)
    // The canonical form of a drawing made here has no trace of the field, and re-sanitizing
    // it gives the very same bytes.
    expect(assetToJson(sanitized)).not.toContain('sourceRef')
    expect(assetToJson(sanitizePintaAsset(structuredClone(sanitized))!)).toBe(
      assetToJson(sanitized),
    )
    for (const bad of [
      '',
      'sem-dois-pontos',
      'Maiuscula:x',
      'a: espaço',
      7,
      null,
      'a:'.padEnd(300, 'x'),
    ]) {
      expect(sanitizeSourceRef(bad)).toBeUndefined()
      const withBad = sanitizePintaAsset({ ...structuredClone(plain), sourceRef: bad })
      expect(withBad).not.toBeNull()
      expect(Object.hasOwn(withBad!, 'sourceRef')).toBe(false)
    }
  })

  it('duplicating or restoring creates a NEW drawing without the mark', () => {
    const asset = { ...createTilesetAsset({ name: 'terreno', tileSize: 16 }), sourceRef: ref }
    expect(cloneWithNewIds(asset, 'terreno-2').sourceRef).toBeUndefined()
    const plan = planImport([asset], new Set([asset.id]), new Set(['terreno']))
    expect(plan.pairs[0]?.restored.sourceRef).toBeUndefined()
    expect(asset.sourceRef).toBe(ref)
  })
})

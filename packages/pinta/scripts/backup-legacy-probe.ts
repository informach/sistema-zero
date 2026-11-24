import {
  createPixelSpriteAsset,
  createTilemapAsset,
  type PintaAsset,
  type TilemapAsset,
  type TilemapObject,
} from '../src/core/project'
import { galleryToPintaJson, importPintaJson } from '../src/export/projectJson'

/** Fixed identifiers/timestamps allow byte comparisons between separately built modules. */
export function runLegacyBackupProbe() {
  const source = createPixelSpriteAsset({ name: 'heroi', frameSize: 16, now: 100 })
  const sprite = {
    ...source,
    id: 'sprite',
    layers: source.layers.map((layer) => ({ ...layer, id: 'pixels' })),
    animations: source.animations.map((animation) => ({ ...animation, id: 'parado' })),
  }
  const base = createTilemapAsset({ name: 'fase', tilesetId: 'ground', cols: 2, rows: 2, now: 100 })
  const map: TilemapAsset = {
    ...base,
    id: 'map',
    layers: base.layers.map((layer) => ({ ...layer, id: 'floor' })),
  }
  const object: TilemapObject = {
    id: 'o',
    name: 'Ponto',
    type: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    properties: {},
  }
  const objects = {
    kind: 'objects' as const,
    id: 'objects',
    name: 'Objetos',
    visible: true,
    objects: [object],
  }
  const cases: PintaAsset[][] = [
    [],
    [sprite],
    [{ ...map, layers: [...map.layers, objects] }],
    [{ ...map, layers: map.layers.map((layer) => ({ ...layer, opacity: 1 })) }],
    [{ ...map, layers: [...map.layers, { ...objects, objects: [{ ...object, shape: 'point' }] }] }],
    [{ ...map, layers: map.layers.map((layer) => ({ ...layer, offsetX: 0.25 })) }],
    [{ ...map, resources: [{ sourceId: 'original', capturedAt: 200, asset: sprite }] }],
    [{ ...map, physics: 'precise' }],
  ]
  return cases.map((assets) => {
    const text = galleryToPintaJson(assets),
      restored = importPintaJson(text)
    return {
      version: JSON.parse(text).version as number,
      text,
      warnings: restored.warnings,
      restored: restored.assets.length,
    }
  })
}

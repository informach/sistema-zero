import { expect, it } from 'bun:test'
import {
  createTilemapAsset,
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  PINTA_LIMITS,
  sanitizePintaAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { addMapObject, createMapObject, updateMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { createObjectTemplate } from './objectTemplate'
import { freezeObjectResource } from './resourceVersions'
import { addObjectLayer } from './tilemapOps'

function scene(rotation: number, shape: 'art' | 'polyline' = 'art') {
  const base = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'pecas', cols: 16, rows: 16 }),
    'Objetos',
  )
  const source = createMapObject({
    id: 'casa',
    name: 'Casa',
    shape,
    x: 32,
    y: 16,
    width: 32,
    height: 16,
    rotation,
    flipX: true,
    art: shape === 'art' ? { assetId: 'folhas', animationId: 'vento' } : undefined,
    points:
      shape === 'polyline'
        ? [
            { x: 0, y: 0 },
            { x: 32, y: 16 },
            { x: 16, y: 32 },
          ]
        : undefined,
    collision: true,
    role: 'trigger',
    properties: { valor: 5, self: { type: 'object', value: 'casa' } },
  })
  const map = addMapObject(base, base.layers.at(-1)!.id, source)
  return { map, source, layerId: map.layers.at(-1)!.id }
}

it('modelo conserva a geometria inteira com giros livres, propriedades e animação', () => {
  for (const shape of ['art', 'polyline'] as const)
    for (const rotation of [0, 45, 90, 135, 180, 270, 359]) {
      const { map, source, layerId } = scene(rotation, shape)
      const template = createObjectTemplate(map, layerId, source.id, 16, 'modelo')
      if (!template) throw new Error('Modelo esperado')
      const layer = template.map.layers.find(isObjectLayer)!,
        object = layer.objects[0]!
      const box = objectBounds(object),
        offset = effectiveLayer(template.map, layer)
      expect(layer.objects).toHaveLength(1)
      expect(box.x + offset.offsetX).toBeGreaterThanOrEqual(-1e-7)
      expect(box.y + offset.offsetY).toBeGreaterThanOrEqual(-1e-7)
      expect(box.x + box.width + offset.offsetX).toBeLessThanOrEqual(template.map.cols * 16 + 1e-7)
      expect(box.y + box.height + offset.offsetY).toBeLessThanOrEqual(template.map.rows * 16 + 1e-7)
      expect(object).toMatchObject({ collision: true, role: 'trigger', flipX: true })
      expect(object.rotation ?? 0).toBe(rotation)
      expect(object.art).toEqual(source.art)
      expect(object.points).toEqual(source.points)
      expect(object.properties.self).toEqual({ type: 'object', value: object.id })
      expect(sanitizePintaAsset(withPintaSchemaStamp(template))).toEqual(
        withPintaSchemaStamp(template),
      )
      expect(map.layers.filter(isObjectLayer)[0]!.objects[0]).toEqual(source)
    }
})

it('offsets de grupo e camada entram uma vez e outras artes e células não entram no modelo', () => {
  const { map: original, source, layerId } = scene(45)
  const base = addMapObject(
    original,
    layerId,
    createMapObject({ id: 'vizinho', x: 32, y: 16, width: 16, height: 16 }),
  )
  const map = {
    ...base,
    layers: [
      ...base.layers.slice(0, -1).map((l) =>
        isTileLayer(l)
          ? {
              ...l,
              collision: true as const,
              properties: { piso: 'pedra' },
              cells: new Int16Array(256).fill(0),
            }
          : l,
      ),
      {
        id: 'grupo',
        kind: 'group' as const,
        name: 'Região',
        visible: true,
        offsetX: 16.5,
        offsetY: -8.5,
      },
      { ...base.layers.at(-1)!, parentId: 'grupo', offsetX: 8.25, offsetY: 16.25 },
    ],
  }
  const template = createObjectTemplate(map, layerId, source.id, 16, 'modelo')!
  const layer = template.map.layers.find(isObjectLayer)!,
    object = layer.objects[0]!
  const box = objectBounds(object),
    offset = effectiveLayer(template.map, layer)
  expect(box.x + offset.offsetX).toBeGreaterThanOrEqual(-1e-7)
  expect(box.y + offset.offsetY).toBeGreaterThanOrEqual(-1e-7)
  expect(box.x + box.width + offset.offsetX).toBeLessThanOrEqual(template.map.cols * 16 + 1e-7)
  expect(box.y + box.height + offset.offsetY).toBeLessThanOrEqual(template.map.rows * 16 + 1e-7)
  expect(template.map.layers.some((l) => l.kind === 'group')).toBe(true)
  expect(layer.objects).toHaveLength(1)
  const floor = template.map.layers[0]!
  if (!isTileLayer(floor)) throw new Error('Base esperada')
  expect(floor.cells.every((cell) => cell === -1)).toBe(true)
  expect(floor.properties).toBeUndefined()
  expect(floor.collision).toBeUndefined()
  expect(sanitizePintaAsset(withPintaSchemaStamp(template))).toEqual(withPintaSchemaStamp(template))
})

it('identidade ausente, conjunto aninhado e modelo além do teto são recusados sem corte', () => {
  const { map, layerId, source } = scene(0)
  expect(createObjectTemplate(map, 'ausente', source.id, 16, 'modelo')).toBeNull()
  expect(createObjectTemplate(map, layerId, 'ausente', 16, 'modelo')).toBeNull()
  const oversized = addMapObject(
    map,
    layerId,
    createMapObject({ id: 'gigante', width: (PINTA_LIMITS.maxTilemapCols + 1) * 16, height: 16 }),
  )
  expect(createObjectTemplate(oversized, layerId, 'gigante', 16, 'modelo')).toBeNull()
  const nested = addMapObject(
    map,
    layerId,
    createMapObject({ id: 'conjunto', shape: 'set', setId: 'vivo', width: 16, height: 16 }),
  )
  expect(createObjectTemplate(nested, layerId, 'conjunto', 16, 'modelo')).toBeNull()
})

it('a versão de arte guardada continua autocontida no modelo e chega à cena', async () => {
  const { createPixelSpriteAsset, createTilesetAsset } = await import('../core/project')
  const { exportPintaScene } = await import('../export/scene')
  const sprite = createPixelSpriteAsset({ name: 'casa', frameSize: 16 }),
    tileset = createTilesetAsset({ name: 'chao', tileSize: 16 })
  const { map: base, layerId, source } = scene(45)
  const animationId = sprite.animations[0]!.id
  const map = updateMapObject({ ...base, tilesetId: tileset.id }, layerId, source.id, {
    art: { assetId: sprite.id, animationId },
  })
  const frozen = freezeObjectResource(
    map,
    layerId,
    source.id,
    (id) => (id === sprite.id ? sprite : null),
    17,
  )
  if (!frozen.ok) throw new Error(frozen.reason)
  const template = createObjectTemplate(frozen.map, layerId, source.id, 16, 'modelo')!
  expect(template.map.resources).toEqual(frozen.map.resources)
  const object = template.map.layers.filter(isObjectLayer)[0]!.objects[0]!
  expect(object.art).toEqual({ assetId: frozen.map.resources![0]!.asset.id, animationId })
  const exported = await exportPintaScene(
    template.map,
    (id) => (id === tileset.id ? tileset : null),
    async () => 'data:image/png;base64,teste',
  )
  const projected = exported.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))
  expect(projected).toHaveLength(1)
  expect(projected[0]!.art).toEqual(object.art)
  expect(
    exported.art?.find((art) => art.id === object.art!.assetId)?.sprite?.animations[0]?.id,
  ).toBe(animationId)
})

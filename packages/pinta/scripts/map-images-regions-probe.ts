/** Real browser image proof. No imports from this file enter the application. */
import {
  type AnyTilesetAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../src/core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../src/tiles/cell'
import { editRegionMapCells, prepareMapRegions } from '../src/tiles/regionMap'
import { tilemapPngDataUrl, tilemapThumbnail } from '../src/tiles/renderTilemap'
import { vectorTilemapPngDataUrl, vectorTilemapPortableSvg } from '../src/tiles/renderVectorTilemap'

function fixture(vector: boolean, advanced: boolean, layered = advanced) {
  const primary = vector
      ? createVectorTilesetAsset({ name: 'Base', tileSize: 16 })
      : createTilesetAsset({ name: 'Base', tileSize: 16 }),
    other = vector
      ? createVectorTilesetAsset({ name: 'Detalhe', tileSize: 16 })
      : createTilesetAsset({ name: 'Detalhe', tileSize: 16 })
  primary.id = 'base'
  other.id = 'other'
  for (const [source, asset] of [primary, other].entries()) {
    if (asset.kind === 'tileset') {
      asset.tiles = Array.from({ length: 2 }, (_, tile) => ({
        ...asset.tiles[0]!,
        data: Uint8Array.from({ length: 256 }, (_, at) =>
          (at + tile + source) % 7 ? 1 + ((at + tile + source) % 3) : 0,
        ),
      }))
    } else {
      asset.tiles = Array.from({ length: 2 }, (_, tile) => [
        {
          id: 'surface',
          type: 'rect' as const,
          x: 0,
          y: 0,
          w: 16,
          h: 16,
          rx: 0,
          fill: { type: 'linear' as const, from: '#ff2121', to: '#003fad', angle: 45 + tile * 45 },
          stroke: null,
          opacity: source ? 0.8 : 1,
          rotation: 0,
          maskId: 'window',
        },
        {
          id: 'window',
          type: 'ellipse' as const,
          cx: 8,
          cy: 8,
          rx: 7,
          ry: 7,
          fill: '#ffffff',
          stroke: null,
          opacity: 1,
          rotation: 0,
        },
      ])
    }
    asset.solid = asset.platform = [false, false]
  }
  const map = createTilemapAsset({ name: 'Imagem', tilesetId: primary.id, cols: 64, rows: 4 }),
    cells = Int16Array.from({ length: 256 }, (_, at) =>
      at % 7 === 0
        ? -1
        : makeCell(at % 2, advanced ? [0, CELL_FLIP_H, CELL_FLIP_V, CELL_FLIP_D][at % 4] : 0),
    ),
    layers: TilemapAsset['layers'] = [
      ...(layered
        ? [
            {
              id: 'g',
              kind: 'group' as const,
              name: 'Grupo',
              visible: true,
              opacity: advanced ? 0.65 : 1,
              offsetX: advanced ? 0.25 : 0,
              offsetY: advanced ? -0.5 : 0,
            },
          ]
        : []),
      { id: 'floor', name: 'Chão', visible: true, ...(layered ? { parentId: 'g' } : {}), cells },
      {
        id: 'decor',
        name: 'Detalhes',
        visible: true,
        tilesetId: other.id,
        ...(advanced ? { opacity: 0.45, offsetX: -0.5, offsetY: 0.25 } : {}),
        cells: Int16Array.from(cells, (cell, at) => (at % 3 ? -1 : cell)),
      },
      ...(advanced
        ? [
            {
              id: 'collision',
              name: 'Colisão',
              visible: true,
              collision: true,
              cells: new Int16Array(256).fill(0),
            },
            { id: 'hidden', kind: 'group' as const, name: 'Escondido', visible: false },
            {
              id: 'hidden-tiles',
              parentId: 'hidden',
              name: 'Arte escondida',
              visible: true,
              cells: new Int16Array(256).fill(1),
            },
          ]
        : []),
    ],
    full: TilemapAsset = {
      ...map,
      layers,
      ...(advanced
        ? { resources: [{ sourceId: 'source-base', capturedAt: 1, asset: primary }] }
        : {}),
    },
    decoy = structuredClone(primary)
  if (advanced && decoy.kind === 'tileset') for (const bitmap of decoy.tiles) bitmap.data.fill(3)
  if (advanced && decoy.kind === 'vector-tileset') decoy.tiles = [[], []]
  return { map: full, sheets: [advanced ? decoy : primary, other] as AnyTilesetAsset[] }
}

function regions(map: TilemapAsset, origin: { col: number; row: number }): RegionTilemapAsset {
  const prepared = prepareMapRegions({
    ...map,
    layers: map.layers.map((layer) =>
      isTileLayer(layer) ? { ...layer, cells: new Int16Array(layer.cells.length).fill(-1) } : layer,
    ),
  })
  if (!prepared.ok) throw Error(prepared.reason)
  let result: RegionTilemapAsset = { ...prepared.map, origin }
  for (const layer of map.layers) {
    if (!isTileLayer(layer)) continue
    const edits = Array.from(layer.cells, (cell, at) => ({
        cell,
        col: origin.col + (at % map.cols),
        row: origin.row + Math.floor(at / map.cols),
      })).filter((edit) => edit.cell >= 0),
      changed = editRegionMapCells(result, layer.id, edits)
    if (!changed.ok) throw Error(changed.reason)
    result = changed.map
  }
  return result
}

async function hash(bytes: Uint8Array | string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function imageResult(url: string | null, allowEmpty = false) {
  if (!url) throw Error('Imagem recusada')
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  const rgba = new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
  let painted = 0
  for (let at = 3; at < rgba.length; at += 4) if (rgba[at]) painted++
  if (!painted && !allowEmpty) throw Error('A comparação recebeu uma imagem vazia')
  return {
    width: canvas.width,
    height: canvas.height,
    rgba: await hash(rgba),
    painted,
  }
}

export async function runMapImageProbe(mode: 'legacy' | 'regions') {
  const cases = []
  let preview = ''
  for (const vector of [false, true])
    for (const advanced of [false, true]) {
      // Legacy images flatten one winning tile per cell. Region images use
      // the complete layer compositor, selected explicitly by a neutral group
      // in the basic reference. The published legacy renderer is tested apart.
      const { map, sheets } = fixture(vector, advanced, mode === 'regions' || advanced)
      const referenceSvg = vector ? await hash(await vectorTilemapPortableSvg(map, sheets)) : null
      for (const scale of [0.25, 0.5, 1, 2]) {
        const expectedUrl = vector
            ? await vectorTilemapPngDataUrl(map, sheets, scale)
            : tilemapPngDataUrl(map, sheets, scale),
          expected = await imageResult(expectedUrl)
        if (mode === 'legacy')
          cases.push({ vector, advanced, scale, ...expected, svg: referenceSvg })
        else
          for (const origin of [
            { col: -64, row: -32 },
            { col: -63, row: -31 },
          ]) {
            const region = regions(map, origin),
              url = vector
                ? await vectorTilemapPngDataUrl(region, sheets, scale)
                : tilemapPngDataUrl(region, sheets, scale),
              actual = await imageResult(url)
            cases.push({
              vector,
              advanced,
              scale,
              origin,
              representation: 'layered',
              expected,
              actual,
            })
            if (vector && advanced && scale === 0.25) preview = url!
          }
      }
      if (!vector)
        for (const maxPx of [128, 512]) {
          const expected = await imageResult(tilemapThumbnail(map, sheets, maxPx)?.dataUrl ?? null)
          if (mode === 'legacy') cases.push({ vector, advanced, maxPx, ...expected })
          else {
            const actual = await imageResult(
              tilemapThumbnail(regions(map, { col: -63, row: -31 }), sheets, maxPx)?.dataUrl ??
                null,
            )
            cases.push({ vector, advanced, maxPx, expected, actual })
          }
        }
    }
  return { cases, preview }
}

export async function runWorldMapImageProbe() {
  const pixel = fixture(false, true),
    vector = fixture(true, true),
    pixelWorld = { ...regions(pixel.map, { col: -63, row: -31 }), cols: 10000, rows: 10000 },
    vectorWorld = { ...regions(vector.map, { col: -63, row: -31 }), cols: 10000, rows: 10000 },
    blobs: Array<Promise<string>> = [],
    original = URL.createObjectURL
  // Capture the real Blob sent to the decoder; URL creation and drawing are
  // still performed by the browser. This is confined to the QA bundle.
  URL.createObjectURL = (blob) => {
    if (blob instanceof Blob && blob.type === 'image/svg+xml') blobs.push(blob.text())
    return original.call(URL, blob)
  }
  try {
    const pixelImage = await imageResult(
        tilemapThumbnail(pixelWorld, pixel.sheets, 512)?.dataUrl ?? null,
        true,
      ),
      vectorImage = await imageResult(
        await vectorTilemapPngDataUrl(vectorWorld, vector.sheets, 512 / 160000),
        true,
      ),
      sources = await Promise.all(blobs)
    return {
      pixel: pixelImage,
      vector: vectorImage,
      decoderRoots: sources.map((svg) => svg.slice(0, svg.indexOf('>') + 1)),
    }
  } finally {
    URL.createObjectURL = original
  }
}

import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
  type TilemapAsset,
} from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { regionVila } from '../testing/regionVila'
import { createMapObject } from '../tiles/mapObjects'
import { deriveLoadedPintaImage } from './portableImage'
import type { PintaImageRaster } from './portableImageRender'
import { pythonLegacySceneWorld } from './pythonLegacySceneWorld'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'
import { exportPintaRegionScene } from './regionScene'

const python = process.env.PYTHON ?? 'python'
const options = { encoding: 'utf8' as const, timeout: 10_000 }
const hasPython = spawnSync(python, ['-I', '--version'], options).status === 0

const raster: PintaImageRaster = {
  releaseCanvas(canvas) {
    canvas.width = canvas.height = 1
  },
  createCanvas(width, height) {
    return createCanvas(width, height) as unknown as HTMLCanvasElement
  },
  async drawSvg(svg, canvas) {
    const image = await loadImage(Buffer.from(svg))
    canvas.getContext('2d')!.drawImage(image as unknown as CanvasImageSource, 0, 0)
  },
}
const limits = {
  dimension: 4096,
  imagePixels: 4194304,
  totalImagePixels: 16777216,
  imageBytes: 16777216,
  dataUrlChars: 800000,
}

const colors = ['', '#e62040', '#1695ba', ...Array<string>(13).fill('')]
function resource(index: number) {
  const sheet = createTilesetAsset({ name: `folha-${index}`, tileSize: 16 })
  sheet.paletteId = 'custom'
  sheet.customPalette = { name: 'teste', colors }
  const bitmap = createBitmap(16, 16)
  bitmap.data.fill(index)
  sheet.tiles = [bitmap]
  return sheet
}
function mapOf(sheetId: string, name: string) {
  return createTilemapAsset({ name, tilesetId: sheetId, cols: 5, rows: 3 })
}
async function portable(map: TilemapAsset, assets: readonly PintaAsset[], linked = false) {
  const tilesets = assets.filter((asset) => asset.kind === 'tileset')
  const result = await deriveLoadedPintaImage(
    map,
    {
      version: linked ? 2 : 1,
      algorithm: 'pinta-image-1',
      drawingId: map.id,
      selection: { kind: linked ? 'map-world' : 'map' },
      scale: 2,
    },
    limits,
    { assets, tilesets, raster },
  )
  return result.dataUrl.split(',')[1]!
}

test.skipIf(!hasPython)(
  'admits real legacy PNG1–4 and PNG5 into one query/render interface',
  async () => {
    const sheet = resource(1)
    const front = resource(2)
    sheet.solid[0] = true
    const map = mapOf(sheet.id, 'plano')
    tileLayerAt(map).cells[0] = 0
    map.layers.push({
      id: 'frente',
      name: 'Frente',
      tilesetId: front.id,
      visible: true,
      front: true,
      cells: Int16Array.from({ length: 15 }, (_, index) => (index === 1 ? 0 : -1)),
    })
    const png1 = await portable(map, [sheet, front])
    tileLayerAt(map).opacity = 0.5
    const png2 = await portable(map, [sheet, front])
    const cabana = mapOf(sheet.id, 'cabana')
    map.layers.push({
      kind: 'objects',
      id: 'objetos',
      name: 'Objetos',
      visible: true,
      objects: [
        {
          ...createMapObject({ name: 'porta', type: 'porta', x: 12, y: 8 }),
          role: 'door',
          properties: { destino: { type: 'asset', value: cabana.id } },
        },
      ],
    })
    const png3 = await portable(map, [sheet, front, cabana], true)
    const objects = map.layers.find((layer) => layer.kind === 'objects')
    if (!objects) throw new Error('A cena de teste precisa da porta.')
    objects.objects.push({
      ...createMapObject({ name: 'parede', type: 'parede', x: 24, y: 16 }),
      collision: true,
      shape: 'rect',
      width: 4,
      height: 4,
    })
    const png4 = await portable(map, [sheet, front, cabana], true)
    const rural = regionVila()
    const regional = await exportPintaRegionScene(
      rural.map,
      (id) => rural.assets.find((asset) => asset.id === id),
      nativeImageOf,
    )
    const cover = new Uint8Array(createCanvas(16, 16).toBuffer('image/png'))
    const document = await embedPintaRegionImage(cover, regional.json)
    const png5 = Buffer.from(document.png).toString('base64')

    const file = join(tmpdir(), `pinta-pngs-${crypto.randomUUID()}.py`)
    writeFileSync(
      file,
      `${pythonRegionWorld}\n${pythonLegacySceneWorld}\n${pythonSceneRuntime}
inputs=json.load(sys.stdin)
for version,src in enumerate(inputs,1):
    source=base64.b64decode(src)
    assert _pinta_parse_json(ler_texto_png(source)['text'])['version']==version, version
    world=ler_mundo_cenario(source)
    cena=CenaRegional(world)
    if version==5:
        assert cena.limites==(-1024,-1024,160000,160000)
        first=next(cena.objetos())
        assert first['id']
        continue
    assert cena.limites==(0,0,160,96), (version, cena.limites, world["maps"][cena.mapa_id]["data"]["scale"])
    assert cena.fisica==('precise' if version==4 else 'legacy')
    assert cena.bloqueado((1,1,2,2))
    assert not cena.bloqueado((36,2,2,2))
    captures=[]
    def desenhar(url,crop,matrix,alpha):
        captures.append((world['images'][url],crop,matrix,alpha))
    cena.desenhar(desenhar,(160,96),frente=True)
    assert len(captures)==1, captures
    image,crop,matrix,alpha=captures[0]
    assert matrix[4:]==(32,0) and alpha==1
    if version==1:
        assert crop==(0,32,32,32) and image['png']==source, (crop,image['height'])
    else:
        assert crop==(0,0,16,16), crop
    if version in (3,4):
        porta=next(cena.objetos('door'))
        assert cena.propriedade(porta,'destino') in world['maps']
        assert len(world['maps'])==2
    if version==4:
        assert cena.bloqueado((49,33,1,1))

source=base64.b64decode(inputs[0])
assert len(ler_mundo_cenario(source)['images'])==1
try:
    ler_mundo_cenario(source[:-8])
except ValueError:
    pass
else:
    raise AssertionError("PNG incompleto admitido")
`,
      { flag: 'wx' },
    )
    try {
      const result = spawnSync(python, ['-I', file], {
        ...options,
        input: JSON.stringify([png1, png2, png3, png4, png5]),
      })
      expect(result.status, `${result.stderr}\n${result.error ?? ''}`).toBe(0)
    } finally {
      unlinkSync(file)
    }
  },
)

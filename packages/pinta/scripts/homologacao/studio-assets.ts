import { writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { formatGeneratedSource } from '../../../../scripts/format-generated-source'
import { exportPintaScene } from '../../src/export/scene'
import { drawScene } from '../../src/export/sceneDrawing'
import { vilaEFloresta } from './fixture'
import { nativeImageOf } from './generate'

const { assets, map, cabana } = vilaEFloresta(),
  result = []
for (const source of [map, cabana]) {
  const scene = await exportPintaScene(
    source,
    (id) => assets.find((a) => a.id === id) ?? null,
    nativeImageOf,
  )
  const canvas = createCanvas(source.cols * scene.tileSize, source.rows * scene.tileSize),
    ctx = canvas.getContext('2d')
  const images = new Map(
    await Promise.all(
      [...scene.tilesets, ...(scene.art ?? [])].map(
        async (a) => [a.id, (await loadImage(a.image)) as unknown as CanvasImageSource] as const,
      ),
    ),
  )
  drawScene(ctx as unknown as CanvasRenderingContext2D, scene, images, 'back')
  drawScene(ctx as unknown as CanvasRenderingContext2D, scene, images, 'front')
  result.push({
    id: source.id,
    name: source.name,
    kind: 'image',
    source: 'library',
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    scene,
  })
}
const file = new URL('../../../studio/src/examples/pintaScenes.generated.ts', import.meta.url)
const text = `// Gerado por packages/pinta/scripts/homologacao/studio-assets.ts.\nimport type {ProjectAsset} from '../core/project'\nexport const VILA_SCENE_ASSETS:ProjectAsset[]=${JSON.stringify(result)}\n`
await writeFile(
  file,
  await formatGeneratedSource(
    text,
    file.pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    new URL('../../../studio', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  ),
)

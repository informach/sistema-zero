import { dirname, resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { importTiledScene } from '../../src/export/tiled/import'
import { sceneToNative } from '../../src/export/tiled/native'

GlobalRegistrator.register()
const path = resolve(process.argv[2] ?? 'output/pinta-cenarios/tiled/tiled-roundtrip.json'),
  folder = dirname(path)
const result = await importTiledScene(await Bun.file(path).json(), {
  text: (p) => Bun.file(resolve(folder, p)).text(),
  image: async (p) =>
    `data:image/png;base64,${Buffer.from(await Bun.file(resolve(folder, p)).arrayBuffer()).toString('base64')}`,
})
const converted = await sceneToNative(result.scene, async (url) => {
  const im = await loadImage(url),
    c = createCanvas(im.width, im.height),
    ctx = c.getContext('2d')
  ctx.drawImage(im, 0, 0)
  return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data }
})
console.log(
  JSON.stringify({
    layers: result.scene.layers.length,
    terrains: result.scene.tilesets[0]?.terrains?.map((t) => t.id),
    objects: result.scene.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : [])).length,
    sets: result.scene.sets?.length,
    warnings: result.warnings,
    nativeWarnings: converted.warnings,
    assets: converted.assets.length,
  }),
)

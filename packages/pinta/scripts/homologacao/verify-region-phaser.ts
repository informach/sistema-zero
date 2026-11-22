import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { pngCrc32, readPngDimensions } from '@sistemazero/core/studio/pinta-png-binary'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from '@sistemazero/core/studio/pinta-region-image-limits'
import { isObjectLayer, isTileLayer } from '../../src/core/project'
import { buildScenePackage } from '../../src/export/scenePackage'
import { regionVila } from '../../src/testing/regionVila'
import { setCell } from '../../src/tiles/tilemapOps'
import { nativeImageOf } from './generate'

const { map, cabana, assets } = regionVila()
const signedMap = {
  ...map,
  layers: map.layers.map((layer) =>
    isObjectLayer(layer)
      ? {
          ...layer,
          objects: layer.objects.map((object) =>
            object.role === 'start'
              ? { ...object, x: -8, y: -8 }
              : object.role === 'door'
                ? { ...object, x: 8, y: -16 }
                : object,
          ),
        }
      : layer,
  ),
}
const front = signedMap.layers.find((layer) => isTileLayer(layer) && layer.front)
if (!front) throw new Error('Camada da frente ausente.')
const files = await buildScenePackage(setCell(signedMap, front.id, -1, -1, 16), assets, 'phaser', {
  imageOf: nativeImageOf,
})
const edited = await buildScenePackage(setCell(signedMap, front.id, -1, -1, 19), assets, 'phaser', {
  imageOf: nativeImageOf,
})
const linkedImage = 'mapas/mapa-1/images/tiles-0.png'
const linkedPng = files[linkedImage]
if (!(linkedPng instanceof Uint8Array)) throw new Error('Imagem vinculada ausente.')
const idat = 0x49444154
const payload = deflateSync(new Uint8Array([5])) // a valid zlib stream with an invalid PNG filter
const chunk = Buffer.alloc(12 + payload.byteLength)
chunk.writeUInt32BE(payload.byteLength, 0)
chunk.writeUInt32BE(idat, 4)
chunk.set(payload, 8)
chunk.writeUInt32BE(pngCrc32(chunk, 4, 8 + payload.byteLength), 8 + payload.byteLength)
const slices = [linkedPng.subarray(0, 8)]
const png = new DataView(linkedPng.buffer, linkedPng.byteOffset, linkedPng.byteLength)
let replaced = false
for (let start = 8; start + 12 <= linkedPng.byteLength; ) {
  const end = start + 12 + png.getUint32(start)
  if (png.getUint32(start + 4) !== idat) slices.push(linkedPng.subarray(start, end))
  else if (!replaced) {
    slices.push(chunk)
    replaced = true
  }
  start = end
}
if (!replaced) throw new Error('Raster vinculado ausente.')
const badRaster = new Uint8Array(Buffer.concat(slices))
readPngDimensions(badRaster, PINTA_REGION_IMAGE_PNG_LIMITS) // structure, dimensions and CRC all pass
const types: Record<string, string> = {
  html: 'text/html',
  js: 'text/javascript',
  json: 'application/json',
  png: 'image/png',
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname
    const [, variant, rest] = /^\/(edit|bad|bad-raster)\/(.*)$/.exec(path) ?? []
    const name = (rest ?? path.slice(1)) || 'index.html'
    if (name === 'favicon.ico') return new Response(null, { status: 204 })
    const content =
      name === linkedImage && (variant === 'bad' || variant === 'bad-raster')
        ? variant === 'bad'
          ? new Uint8Array(4)
          : badRaster
        : (variant === 'edit' ? edited : files)[name]
    if (content === undefined) return new Response(null, { status: 404 })
    return new Response(typeof content === 'string' ? content : new Uint8Array(content), {
      headers: { 'content-type': types[name.split('.').at(-1)!] ?? 'application/octet-stream' },
    })
  },
})
try {
  const runner = fileURLToPath(new URL('./verify-region-phaser-browser.mjs', import.meta.url))
  const run = Bun.spawn(
    [
      'node',
      runner,
      server.url.href,
      JSON.stringify({
        origin: signedMap.origin,
        linked: cabana.id,
        mainBytes: Buffer.byteLength(String(files['main.js'])),
      }),
    ],
    { stdout: 'inherit', stderr: 'inherit' },
  )
  process.exitCode = await run.exited
} finally {
  server.stop(true)
}

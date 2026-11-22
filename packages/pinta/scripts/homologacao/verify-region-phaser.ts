import { fileURLToPath } from 'node:url'
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
    const [, variant, rest] = /^\/(edit|bad)\/(.*)$/.exec(path) ?? []
    const name = (rest ?? path.slice(1)) || 'index.html'
    if (name === 'favicon.ico') return new Response(null, { status: 204 })
    const content =
      variant === 'bad' && name === 'mapas/mapa-1/images/tiles-0.png'
        ? new Uint8Array(4)
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

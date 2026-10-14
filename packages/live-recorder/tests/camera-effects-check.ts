import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { chromium } from 'playwright'

const packageRequire = createRequire(join(process.cwd(), '../member-shell/package.json'))
const modelPath = join(
  process.cwd(),
  '../member-shell/assets/live-camera/selfie_segmenter_landscape.tflite',
)
const build = join(process.cwd(), '.cache/camera-effects-test')
let rejectAssets = false
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html><body></body></html>')
      return
    }
    const files: Record<string, string> = {
      '/effects.js': join(build, 'media-camera-effects.js'),
      '/media-camera-effects.worker.ts': join(build, 'media-camera-effects.worker.js'),
    }
    let file = files[path]
    if (path.startsWith('/api/live/camera-assets/')) {
      if (rejectAssets) {
        response.writeHead(503)
        response.end()
        return
      }
      const name = path.split('/').at(-1)!
      if (name === 'selfie_segmenter_landscape.tflite') file = modelPath
      else if (/^vision_wasm_(module_internal|internal|nosimd_internal)\.(js|wasm)$/.test(name))
        file = packageRequire.resolve(`@mediapipe/tasks-vision/${name}`)
    }
    if (!file) {
      response.writeHead(404)
      response.end()
      return
    }
    response.setHeader(
      'Content-Type',
      file.endsWith('.wasm')
        ? 'application/wasm'
        : file.endsWith('.tflite')
          ? 'application/octet-stream'
          : 'text/javascript',
    )
    response.end(await readFile(file))
  } catch (error) {
    response.writeHead(500)
    response.end(String(error))
  }
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
const browser = await chromium.launch({
  headless: true,
  chromiumSandbox: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
try {
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}`)
  const result = await page.evaluate(async () => {
    const modulePath = '/effects.js'
    const { createLiveCameraEffect } = await import(modulePath)
    const input = document.createElement('canvas')
    input.width = 640
    input.height = 360
    const ctx = input.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 640, 360)
    const stream = input.captureStream(15)
    const effect = await createLiveCameraEffect({
      input: stream,
      effect: 'space',
      onFailure: () => {},
    })
    const live = effect.stream.getVideoTracks()[0].readyState === 'live'
    const video = document.createElement('video')
    video.muted = true
    video.srcObject = effect.stream
    await video.play()
    await new Promise((resolve) => setTimeout(resolve, 300))
    ctx.drawImage(video, 0, 0)
    const pixel = [...ctx.getImageData(10, 10, 1, 1).data]
    effect.close()
    return {
      live,
      pixel,
      stopped: stream.getVideoTracks()[0]!.readyState === 'ended',
      outputStopped: effect.stream.getVideoTracks()[0]!.readyState === 'ended',
    }
  })
  assert.equal(result.live, true)
  assert.equal(result.stopped, true)
  assert.equal(result.outputStopped, true)
  assert.notDeepEqual(result.pixel.slice(0, 3), [255, 0, 0])
  await page.close()
  rejectAssets = true
  const failurePage = await browser.newPage()
  await failurePage.goto(`http://127.0.0.1:${address.port}`)
  const failure = await failurePage.evaluate(async () => {
    const modulePath = '/effects.js'
    const { createLiveCameraEffect } = await import(modulePath)
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    canvas.getContext('2d')!.fillRect(0, 0, 640, 360)
    const input = canvas.captureStream(15)
    let notified = false,
      rejected = false
    try {
      await createLiveCameraEffect({
        input,
        effect: 'blur',
        onFailure: () => {
          notified = true
        },
      })
    } catch {
      rejected = true
    }
    return { notified, rejected, stopped: input.getVideoTracks()[0]!.readyState === 'ended' }
  })
  assert.deepEqual(failure, { notified: true, rejected: true, stopped: true })
} finally {
  await browser.close()
  server.close()
}

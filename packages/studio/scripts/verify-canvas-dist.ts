import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join, relative } from 'node:path'
import { chromium } from '@playwright/test'

const root = process.argv[2]!
const files = new Map<string, Buffer>()
async function collect(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await collect(path)
    else files.set(relative(join(root, 'dist'), path).replaceAll('\\', '/'), await readFile(path))
  }
}
await collect(join(root, 'dist'))
const types: Record<string, string> = {
  html: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  json: 'application/json',
}
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/favicon.ico') {
    response.writeHead(204)
    response.end()
    return
  }
  const path = url.pathname.startsWith('/nested/game/')
    ? url.pathname.slice('/nested/game/'.length) || 'index.html'
    : ''
  const bytes = files.get(path)
  response.writeHead(bytes ? 200 : 404, {
    'Content-Type': types[path.split('.').at(-1)!] ?? 'application/octet-stream',
  })
  response.end(bytes ?? 'missing')
})
await new Promise<void>((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  )
  await page.goto(`${origin}/nested/game/`)
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __studioGame?: { inspect(): { readiness: string } } }
      ).__studioGame?.inspect().readiness === 'ready',
  )
  await page.locator('#start').click()
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(200)
  await page.keyboard.up('ArrowRight')
  await page.keyboard.press('Space')
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __studioGame: { inspect(): { tick: number } } }
      ).__studioGame.inspect().tick >= 100,
  )
  await page.screenshot({ path: join(root, 'canvas-export-proof.png') })
  await page.locator('#pause').click()
  const snapshot = await page.evaluate(() =>
    (
      window as unknown as {
        __studioGame: {
          inspect(): {
            phase: string
            readiness: string
            tick: number
            health: number
            player: { x: number }
            targets: unknown[]
          }
        }
      }
    ).__studioGame.inspect(),
  )
  assert.equal(snapshot.phase, 'paused')
  assert.equal(snapshot.readiness, 'ready')
  assert.ok(snapshot.player.x > 360)
  assert.ok(snapshot.targets.length > 0)
  await page.waitForTimeout(100)
  const frozenTick = await page.evaluate(
    () =>
      (
        window as unknown as { __studioGame: { inspect(): { tick: number } } }
      ).__studioGame.inspect().tick,
  )
  assert.equal(frozenTick, snapshot.tick)
  assert.deepEqual(errors, [])
  const captureBytes = (await readFile(join(root, 'canvas-export-proof.png'))).byteLength
  console.log(
    JSON.stringify({
      captureBytes,
      tick: snapshot.tick,
      health: snapshot.health,
      nestedPath: true,
      errors,
    }),
  )
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
}

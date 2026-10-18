import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, freemem, release, totalmem } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, chromium } from '@playwright/test'
import { assertRun, deadline, finalizeEvidence } from './checks.ts'
import type { qualifyPinta } from './pinta-browser.ts'
import { attachPintaCancellationProbe } from './pinta-cancellation.ts'
import type {} from './probe.ts'

const engine = process.env.L0_ENGINE ?? 'chrome'
const scenario = process.env.L0_SCENARIO ?? 'baseline'
assert.ok(engine === 'chrome' || engine === 'edge')
assert.ok(scenario === 'baseline' || scenario === 'video')
const folder = resolve(
  import.meta.dirname,
  '../../.cache/studio-python-l0',
  `reference-${engine}-${scenario}-${randomUUID()}`,
)
await mkdir(folder, { recursive: true })
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  engine,
  scenario,
  videoPresence:
    scenario === 'video' ? 'operator-declared; not recorded or verified' : 'none requested',
  machine: {
    os: process.platform,
    release: release(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
    freeMemoryBeforeBytes: freemem(),
    node: process.version,
  },
  scope:
    'L0 slices only; local no-store runtime resources; not network/player/full game qualification',
  qualification: 'in-progress',
}
const samples: { bootMs: number; firstDrawingMs: number; stopMs: number }[] = []
evidence.runtimeSamples = samples
const save = () =>
  writeFile(resolve(folder, 'report.json'), `${JSON.stringify(evidence, null, 2)}\n`)
await save()
const server = spawn('bun', ['reference-server.ts'], {
  cwd: import.meta.dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
const lines = createInterface({ input: server.stdout })
const serverErrors: string[] = []
server.stderr.on('data', (chunk) => {
  if (serverErrors.length < 20) serverErrors.push(chunk.toString().slice(-2000))
})
evidence.serverErrors = serverErrors
let browser: Browser | undefined
try {
  const addresses = await deadline(
    new Promise<{ runtime: string; pinta: string }>((done, reject) => {
      server.once('error', reject)
      server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)))
      lines.once('line', (line) => {
        try {
          const value = JSON.parse(line)
          for (const key of ['runtime', 'pinta']) {
            const url = new URL(value[key])
            assert.equal(url.hostname, '127.0.0.1')
            assert.equal(url.protocol, 'http:')
          }
          done(value)
        } catch (error) {
          reject(error)
        }
      })
    }),
    15000,
    'Reference server',
  )
  browser = await chromium.launch({
    channel: engine === 'edge' ? 'msedge' : 'chrome',
    headless: false,
    timeout: 20000,
  })
  evidence.browser = browser.version()
  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()
  await page.goto(`${addresses.runtime}/?mode=blob-classic`, { timeout: 15000 })
  evidence.display = await page.evaluate(() => ({
    screenCssWidth: screen.width,
    screenCssHeight: screen.height,
    devicePixelRatio,
    viewport: { width: innerWidth, height: innerHeight },
  }))
  const frame = page.frames().find((item) => item.url().includes('/frame?'))
  assert.ok(frame)
  await frame.waitForFunction(() => globalThis.l0?.state.status === 'ready', undefined, {
    timeout: 30000,
  })
  // Preparation is excluded explicitly. Each measured cycle constructs a new
  // interpreter. HTTP responses are no-store; these are not warm-cache claims.
  for (let i = 0; i < 30; i++) {
    await frame.evaluate(() => {
      globalThis.l0.stop()
      globalThis.l0.resetGraphics()
    })
    const began = performance.now()
    await frame.evaluate(() => globalThis.l0.start())
    await frame.waitForFunction(
      () => ['ready', 'failed'].includes(globalThis.l0.state.status),
      undefined,
      { timeout: 30000 },
    )
    assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
    const bootMs = performance.now() - began
    const drawing = await deadline(
      frame.evaluate(async () => ({
        result: await globalThis.l0.run(
          'import turtle\ns = turtle.Screen()\ns.tracer(0)\na = turtle.Turtle()\nb = turtle.Turtle()\nb.pencolor("blue")\nfor i in range(100):\n    a.forward(3)\n    a.left(17)\n    b.forward(2)\n    b.right(13)\ns.update()\nprint("200-lines")',
          { turtle: true },
        ),
        output: [...globalThis.l0.state.events],
      })),
      10000,
      'Reference drawing',
    )
    assertRun(drawing, ['200-lines'])
    assert.equal(await frame.evaluate(() => globalThis.l0.graphics()?.lines), 200)
    const firstDrawingMs = performance.now() - began
    const stopMs = await frame.evaluate(() => globalThis.l0.stop())
    samples.push({ bootMs, firstDrawingMs, stopMs })
    await save()
    console.log(`Python: ${i + 1}/30`)
  }
  const cancellationWorkers = await attachPintaCancellationProbe(page, browser)
  evidence.cancellationWorkers = cancellationWorkers
  await page.goto(addresses.pinta, { timeout: 15000 })
  await page.waitForFunction(() => typeof globalThis.pintaL0 === 'function', undefined, {
    timeout: 10000,
  })
  const pinta: Awaited<ReturnType<typeof qualifyPinta>> = await deadline(
    page.evaluate(() => globalThis.pintaL0(30)),
    180000,
    'Reference Pinta',
  )
  const { raster, frame: vectorFrame, map, ...measurements } = pinta
  evidence.pinta = measurements
  assert.ok(
    pinta.frames.length > 0 && pinta.frames.every((value) => Number.isFinite(value) && value >= 0),
  )
  const pngHashes: Record<string, string> = {}
  for (const [name, asset] of Object.entries({ raster, frame: vectorFrame, map })) {
    const bytes = Buffer.from(asset.dataUrl.split(',')[1] ?? '', 'base64')
    pngHashes[name] = createHash('sha256').update(bytes).digest('hex')
  }
  evidence.pngHashes = pngHashes
  assert.equal(pinta.samples.length, 30)
  assert.equal(map.width, 2048)
  assert.equal(map.height, 2048)
  // PNG encoders can differ across browser versions; test decoded pixels here.
  assert.deepEqual(map.origin, [255, 0, 0, 255])
  assert.deepEqual(map.secondTile, [0, 0, 255, 255])
  assert.equal(pinta.cancellation.length, 30)
  assert.equal(cancellationWorkers.length, 30)
  assert.ok(pinta.cancellation.every((item) => item.acknowledgedRows > 0))
  const summarize = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: sorted.length,
      median: sorted[Math.ceil(sorted.length / 2) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      max: sorted.at(-1),
    }
  }
  evidence.summaryMs = {
    boot: summarize(samples.map((item) => item.bootMs)),
    firstDrawing: summarize(samples.map((item) => item.firstDrawingMs)),
    stop: summarize(samples.map((item) => item.stopMs)),
    conversion: summarize(pinta.samples),
    paintInterval: summarize(pinta.frames),
    cancellation: summarize(pinta.cancellation.map((item) => item.elapsedMs)),
  }
  evidence.qualification = 'reference-slices-collected; thresholds require review'
} catch (error) {
  evidence.qualification = 'failed'
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  if (browser) {
    try {
      await deadline(browser.close(), 5000, 'Browser cleanup')
    } catch (error) {
      evidence.cleanupFailure = String(error)
      process.exitCode = 1
    }
  }
  lines.close()
  server.kill()
  evidence.freeMemoryAfterBytes = freemem()
  finalizeEvidence(evidence)
  await save()
  console.log(`Relatorio: ${folder}`)
}

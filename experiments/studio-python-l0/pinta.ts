import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus, totalmem } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, type CDPSession, chromium } from '@playwright/test'
import { deadline } from './checks.ts'
import type { qualifyPinta } from './pinta-browser.ts'
import { attachPintaCancellationProbe } from './pinta-cancellation.ts'

async function captureTrace(session: CDPSession, folder: string) {
  const complete = new Promise<string>((done, reject) =>
    session.once('Tracing.tracingComplete', (event) => {
      if (event.stream) done(event.stream)
      else reject(new Error('Tracing did not return a stream'))
    }),
  )
  await session.send('Tracing.end')
  const stream = await deadline(complete, 10000, 'Pinta trace completion')
  let trace = ''
  try {
    while (true) {
      const chunk = await deadline(session.send('IO.read', { handle: stream }), 5000, 'Trace read')
      trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString('utf8') : chunk.data
      if (trace.length > 100 * 1024 * 1024) throw new Error('Trace limit exceeded')
      if (chunk.eof) break
    }
  } finally {
    await session.send('IO.close', { handle: stream })
  }
  await writeFile(resolve(folder, 'trace.json'), trace)
  const events = JSON.parse(trace).traceEvents as { name: string; dur?: number }[]
  const totals = new Map<string, { durationMs: number; maxMs: number; count: number }>()
  for (const event of events)
    if (event.dur !== undefined) {
      const stat = totals.get(event.name) ?? { durationMs: 0, maxMs: 0, count: 0 }
      stat.durationMs += event.dur / 1000
      stat.maxMs = Math.max(stat.maxMs, event.dur / 1000)
      stat.count++
      totals.set(event.name, stat)
    }
  return [...totals].sort((a, b) => b[1].durationMs - a[1].durationMs).slice(0, 15)
}

const createdAt = new Date().toISOString()
const repetitions = Number(process.env.L0_PINTA_RUNS ?? 30)
const method = process.env.L0_PINTA_METHOD ?? 'tiles'
assert.ok(method === 'svg' || method === 'tiles')
const browserArgs: { runs: number; method: 'svg' | 'tiles' } = { runs: repetitions, method }
assert.ok(Number.isSafeInteger(repetitions) && repetitions > 0 && repetitions <= 30)
const directory = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
const folder = resolve(directory, `pinta-${randomUUID()}`)
await mkdir(folder, { recursive: true })
const evidence: Record<string, unknown> = {
  createdAt,
  method,
  machine: { cpu: cpus()[0]?.model, memory: totalmem() },
  qualification: 'in-progress',
  scope:
    'materialization and desktop PNG slice; not L5A integration or reference-machine performance',
}
const server = spawn('bun', ['pinta-server.ts'], {
  cwd: import.meta.dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
const lines = createInterface({ input: server.stdout })
const errors: string[] = []
server.stderr.on('data', (chunk) => {
  if (errors.length < 20) errors.push(chunk.toString().slice(-4000))
})
evidence.serverErrors = errors
let browser: Browser | undefined
let profiling: CDPSession | undefined
const progress: unknown[] = []
evidence.progress = progress
try {
  const boot = await deadline(
    new Promise<{ url: string; inputs: number; bytes: number }>((done, reject) => {
      server.once('error', reject)
      server.once('exit', (code) =>
        reject(new Error(`Pinta server exited ${code}: ${errors.join('\n')}`)),
      )
      lines.once('line', (line) => {
        try {
          done(JSON.parse(line))
        } catch (error) {
          reject(error)
        }
      })
    }),
    30000,
    'Pinta build/server',
  )
  evidence.build = boot
  const meta = await readFile(resolve(directory, 'pinta-bundle/metafile.json'))
  evidence.bundleMetafileSha256 = createHash('sha256').update(meta).digest('hex')
  browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 20000 })
  evidence.browser = browser.version()
  const page = await browser.newPage()
  const cancellationWorkers = await attachPintaCancellationProbe(page, browser)
  evidence.cancellationWorkers = cancellationWorkers
  if (process.env.L0_PINTA_PROFILE === '1') {
    profiling = await page.context().newCDPSession(page)
    await profiling.send('Tracing.start', {
      categories: 'devtools.timeline,blink.user_timing',
      transferMode: 'ReturnAsStream',
    })
  }
  page.on('console', (message) => {
    if (message.text().startsWith('PINTA_PROGRESS ') && progress.length < 100) {
      const update = JSON.parse(message.text().slice('PINTA_PROGRESS '.length))
      progress.push(update)
      console.log(JSON.stringify(update))
    }
  })
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  evidence.requests = requests
  await page.goto(boot.url, { timeout: 10000 })
  await page.waitForFunction(() => typeof globalThis.pintaL0 === 'function', undefined, {
    timeout: 10000,
  })
  const result: Awaited<ReturnType<typeof qualifyPinta>> = await deadline(
    page.evaluate(
      ({ runs, method }: { runs: number; method: 'svg' | 'tiles' }) =>
        globalThis.pintaL0(runs, method),
      browserArgs,
    ),
    120000,
    'Pinta conversions',
  )
  const { raster, frame, map, ...measurements } = result
  evidence.measurements = measurements
  const sorted = [...result.samples].sort((a, b) => a - b)
  evidence.conversionMs = {
    samples: sorted.length,
    median: sorted[Math.ceil(sorted.length / 2) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1),
  }
  const frames = [...result.frames].sort((a, b) => a - b)
  evidence.paintIntervalsMs = {
    samples: frames.length,
    p95: frames[Math.ceil(frames.length * 0.95) - 1],
    max: frames.at(-1),
  }
  assert.equal(result.samples.length, repetitions)
  assert.ok(
    result.frames.length > 0 &&
      result.frames.every((value) => Number.isFinite(value) && value >= 0),
  )
  assert.equal(result.cancellation.length, 30)
  assert.equal(cancellationWorkers.length, 30)
  assert.ok(result.cancellation.every((item) => item.acknowledgedRows > 0 && item.elapsedMs <= 250))
  const cdp = await browser.newBrowserCDPSession()
  const closingBegan = performance.now()
  while (true) {
    const targets = await deadline(cdp.send('Target.getTargets'), 1000, 'Worker target inspection')
    const remaining = targets.targetInfos.filter((target) => target.type === 'worker')
    evidence.remainingWorkers = remaining
    evidence.workerClosureMs = performance.now() - closingBegan
    if (remaining.length === 0) break
    assert.ok(
      performance.now() - closingBegan < 1000,
      'Converters did not drain after individually verified cancellations',
    )
    // Final aggregate check, additional to the per-operation native events.
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  for (const [name, png, dimensions] of [
    ['raster', raster, [512, 512]],
    ['frame', frame, [128, 64]],
    ['map', map, [2048, 2048]],
  ] as const) {
    const { dataUrl, ...data } = png
    evidence[name] = data
    assert.deepEqual([png.width, png.height], dimensions)
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    await writeFile(resolve(folder, `${name}.png`), bytes)
    evidence[`${name}Sha256`] = createHash('sha256').update(bytes).digest('hex')
  }
  assert.equal(raster.origin[3], 255)
  assert.equal(raster.bottom[3], 0)
  assert.deepEqual(frame.origin, [255, 0, 0, 255])
  assert.equal(frame.bottom[3], 0)
  assert.deepEqual(map.origin, [255, 0, 0, 255])
  assert.deepEqual(map.secondTile, [0, 0, 255, 255])
  assert.equal(
    evidence.mapSha256,
    '1d7d1bfac5908681efb4fb004d2540364d51e0e0ac27085853c7dd67130c5de9',
    'Candidate must preserve the full original PNG, not just sampled pixels',
  )
  assert.ok(requests.every((url) => url.startsWith(boot.url) || url.startsWith('blob:')))
  const differential = await deadline(
    page.evaluate(() => globalThis.pintaDifferentialL0()),
    30000,
    'Pinta differential',
  )
  evidence.differential = differential
  assert.ok(
    differential.every((item) => item.differingComponents === 0),
    'Pinta differential changed decoded pixels',
  )
  const python = resolve(directory, 'cpython-3.14.2/python.exe')
  const reference = spawnSync(
    python,
    [
      '-I',
      '-X',
      'utf8',
      '-c',
      'import json, sys, turtle, tkinter\nfrom pathlib import Path\nscreen = turtle.Screen()\nscreen.getcanvas().winfo_toplevel().withdraw()\nresult = []\nfor name in ("raster", "frame", "map"):\n    path = str(Path(sys.argv[1]) / (name + ".png"))\n    screen.register_shape(path)\n    pen = turtle.Turtle(shape=path)\n    assert pen.shape() == path\n    image = tkinter.PhotoImage(master=screen.getcanvas(), file=path)\n    result.append({"name": name, "width": image.width(), "height": image.height(), "pixel": image.get(1, 1), "transparentBottom": image.transparency_get(1, image.height()-2)})\nprint(json.dumps({"python": sys.version, "tk": screen.getcanvas().tk.call("package", "provide", "Tk"), "images": result}))\nscreen.bye()',
      folder,
    ],
    { timeout: 15000, encoding: 'utf8', windowsHide: true },
  )
  evidence.desktop = {
    status: reference.status,
    error: reference.error?.message,
    stdout: reference.stdout,
    stderr: reference.stderr,
  }
  assert.equal(reference.error, undefined)
  assert.equal(reference.status, 0, reference.stderr)
  const native = JSON.parse(reference.stdout)
  assert.ok(native.python.startsWith('3.14.2 '))
  assert.equal(native.tk, '8.6.15')
  assert.deepEqual(
    native.images.map((image: { width: number; height: number }) => [image.width, image.height]),
    [
      [512, 512],
      [128, 64],
      [2048, 2048],
    ],
  )
  assert.equal(native.images[0].transparentBottom, true)
  assert.equal(native.images[1].transparentBottom, true)
  assert.deepEqual(native.images[2].pixel, [255, 0, 0])
  evidence.qualification = 'materialization-desktop-slice-passed'
} catch (error) {
  evidence.qualification = 'failed'
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  try {
    if (profiling) evidence.profile = await captureTrace(profiling, folder)
  } catch (error) {
    evidence.profileFailure = String(error)
    evidence.qualification = 'failed'
    process.exitCode = 1
  }
  try {
    if (browser) await deadline(browser.close(), 5000, 'Pinta browser cleanup')
  } catch (error) {
    evidence.cleanupFailure = String(error)
    evidence.qualification = 'failed'
    process.exitCode = 1
  }
  lines.close()
  server.kill()
  await writeFile(resolve(folder, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
}
console.log(
  JSON.stringify({
    qualification: evidence.qualification,
    failure: evidence.failure,
    conversionMs: evidence.conversionMs,
    paintIntervalsMs: evidence.paintIntervalsMs,
    output: resolve(folder, 'evidence.json'),
  }),
)

import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { promisify } from 'node:util'
import { type Browser, chromium } from '@playwright/test'
import { deadline, finalizeEvidence } from './checks.ts'
import type {} from './probe.ts'
import { hashSources } from './source-hashes.ts'

assert.equal(process.platform, 'win32', 'This collector measures Windows native process memory')
const engine = process.env.L0_ENGINE ?? 'chrome'
assert.ok(engine === 'chrome' || engine === 'edge')
const output = resolve(
  import.meta.dirname,
  '../../.cache/studio-python-l0',
  `resources-${engine}-${randomUUID()}.json`,
)
const samples: Record<string, unknown>[] = []
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  engine,
  samples,
  scope:
    'Native process snapshots of the L0 Turtle slice; not full editor/parser or instantaneous peak memory',
}
const sources = await hashSources()
evidence.sources = sources
const server = spawn('bun', ['server.ts'], {
  cwd: import.meta.dirname,
  env: { ...process.env, L0_PROTECTED_WORKERS: '1', L0_ISOLATE: '0' },
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
})
const lines = createInterface({ input: server.stdout })
let browser: Browser | undefined
try {
  const url = await deadline(
    new Promise<string>((done, reject) => {
      server.once('error', reject)
      server.once('exit', (code) => reject(new Error(`Server exit ${code}`)))
      lines.once('line', (line) => {
        try {
          done(JSON.parse(line).url)
        } catch (error) {
          reject(error)
        }
      })
    }),
    10000,
    'Resource server',
  )
  browser = await chromium.launch({
    channel: engine === 'edge' ? 'msedge' : 'chrome',
    headless: true,
  })
  evidence.browser = browser.version()
  const cdp = await browser.newBrowserCDPSession()
  const page = await browser.newPage()
  async function memory() {
    const { processInfo } = await cdp.send('SystemInfo.getProcessInfo')
    // All PIDs come from this owned browser's protocol, never an image-name
    // scan of the user's browser sessions. Include GPU/utility/browser too.
    const ids = processInfo.map((item) => item.id)
    assert.ok(ids.length > 0 && ids.every((id) => Number.isSafeInteger(id) && id > 0))
    const result = await promisify(execFile)(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-File',
        resolve(import.meta.dirname, 'native-memory.ps1'),
        '-ProcessIds',
        ids.join(','),
      ],
      { windowsHide: true, timeout: 10000 },
    )
    const rows: unknown = JSON.parse(result.stdout)
    assert.ok(Array.isArray(rows) && rows.length === ids.length)
    let privateBytes = 0
    let workingSetBytes = 0
    for (const row of rows) {
      assert.ok(row && typeof row === 'object' && ids.includes(row.id))
      if (row.exited === true) continue
      assert.ok(
        row &&
          typeof row === 'object' &&
          ids.includes(row.id) &&
          Number.isSafeInteger(row.privateBytes) &&
          row.privateBytes >= 0 &&
          Number.isSafeInteger(row.workingSetBytes) &&
          row.workingSetBytes >= 0,
      )
      privateBytes += row.privateBytes
      workingSetBytes += row.workingSetBytes
    }
    assert.ok(privateBytes > 0 && workingSetBytes > 0)
    return { privateBytes, workingSetBytes, processes: rows }
  }
  const baseline = await memory()
  evidence.baseline = baseline
  await page.goto(`${url}/?mode=blob-classic`)
  const frame = page.frames().find((item) => item.url().includes('/frame?'))
  assert.ok(frame)
  const retained: number[] = []
  const active: number[] = []
  for (let cycle = 0; cycle < 30; cycle++) {
    const sample: Record<string, unknown> = { cycle }
    samples.push(sample)
    await frame.waitForFunction(
      () => ['ready', 'failed'].includes(globalThis.l0?.state.status),
      undefined,
      { timeout: 30000 },
    )
    assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
    assert.equal(
      (
        await frame.evaluate(() =>
          globalThis.l0.run(
            'import turtle\ns=turtle.Screen()\ns.tracer(0)\na=turtle.Turtle()\nb=turtle.Turtle()\nfor i in range(100):\n    a.forward(3)\n    a.left(17)\n    b.forward(2)\n    b.right(13)\ns.update()\nprint("memory-fixture")',
            { turtle: true },
          ),
        )
      ).ok,
      true,
    )
    assert.equal(await frame.evaluate(() => globalThis.l0.graphics()?.lines), 200)
    const running = await memory()
    sample.active = running
    active.push(running.privateBytes)
    await frame.evaluate(() => globalThis.l0.stop())
    const stopped = performance.now()
    while (
      (await cdp.send('Target.getTargets')).targetInfos.some((item) => item.type === 'worker')
    ) {
      assert.ok(performance.now() - stopped < 3000, 'Owned runtime worker did not terminate')
      await new Promise((done) => setTimeout(done, 10))
    }
    sample.workersGoneMs = performance.now() - stopped
    const idle = await memory()
    sample.idle = idle
    retained.push(idle.privateBytes)
    if (cycle < 29)
      await frame.evaluate(() => {
        globalThis.l0.resetGraphics()
        globalThis.l0.start()
      })
    console.log(
      JSON.stringify({
        cycle,
        activeMiB: running.privateBytes / 1048576,
        idleMiB: idle.privateBytes / 1048576,
      }),
    )
  }
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
  const warmRetained = average(retained.slice(5, 10))
  const finalRetained = average(retained.slice(25, 30))
  evidence.summary = {
    baselinePrivateBytes: baseline.privateBytes,
    maximumActiveIncrementBytes: Math.max(...active) - baseline.privateBytes,
    warmRetained,
    finalRetained,
    retainedGrowthFraction: finalRetained / warmRetained - 1,
    forcedGc: false,
  }
  assert.ok(
    Math.max(...active) - baseline.privateBytes <= 256 * 1048576,
    'L0 native increment exceeded 256 MiB',
  )
  assert.ok(
    finalRetained <= warmRetained * 1.1,
    'Native retained memory grew by more than 10%; investigate',
  )
  evidence.qualification = 'native-memory-slice-passed'
} catch (error) {
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  if (browser) {
    try {
      await deadline(browser.close(), 5000, 'Resource browser close')
    } catch (error) {
      evidence.cleanupFailure = String(error)
      process.exitCode = 1
    }
  }
  lines.close()
  server.kill()
  if (JSON.stringify(sources) !== JSON.stringify(await hashSources())) {
    evidence.failure = 'Sources changed'
    process.exitCode = 1
  }
  await mkdir(resolve(output, '..'), { recursive: true })
  finalizeEvidence(evidence)
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(
    JSON.stringify({ output, qualification: evidence.qualification, failure: evidence.failure }),
  )
}

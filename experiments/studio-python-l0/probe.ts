import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { cpus, release, totalmem } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, chromium, type Frame, firefox, webkit } from '@playwright/test'
import { assertRun, deadline, type RunEvidence, selectNames } from './checks.ts'
import { qualifyGraphics } from './graphics.ts'
import { qualifyInput } from './input.ts'
import { hashSources } from './source-hashes.ts'

interface ProbeState {
  status: string
  events: RunEvidence['output']
  boot: { python?: string; pyodide?: string; jspi?: boolean; control?: boolean } | null
  error?: string
  inputId: number | null
}
declare global {
  var l0: {
    state: ProbeState
    start(): void
    stop(): number
    run(code: string, options?: { turtle: boolean }): Promise<RunEvidence['result']>
    stoppedRun?: RunEvidence['result']
    interactiveRun?: RunEvidence['result']
    resetGraphics(): void
    graphics(): { lines: number; batches: number } | null
    inputKey(key: string): void
    submitLine(line: string | null): void
  }
}

const profiles = [
  { name: 'chromium', engine: chromium, channel: undefined },
  { name: 'firefox', engine: firefox, channel: undefined },
  { name: 'webkit', engine: webkit, channel: undefined },
  { name: 'chrome', engine: chromium, channel: 'chrome' },
  { name: 'edge', engine: chromium, channel: 'msedge' },
]
const engineNames = selectNames(
  profiles.map((profile) => profile.name),
  process.env.L0_ENGINE,
)
const modes = selectNames(['direct', 'blob-inline', 'blob', 'blob-classic'], process.env.L0_MODE)
const outputDirectory = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
await mkdir(outputDirectory, { recursive: true })
const createdAt = new Date().toISOString()
const outputPath = resolve(
  outputDirectory,
  `browser-probes-${createdAt.replaceAll(':', '-')}-${randomUUID()}.json`,
)
const results: Record<string, unknown>[] = []
let distribution: unknown
const sources = await hashSources()
const machine = {
  os: process.platform,
  release: release(),
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  totalMemoryBytes: totalmem(),
  node: process.version,
}
async function save() {
  const temporary = `${outputPath}.tmp`
  await writeFile(
    temporary,
    `${JSON.stringify({ createdAt, machine, sources, distribution, engineNames, modes, results }, null, 2)}\n`,
  )
  await rename(temporary, outputPath)
}
await save()

// Browser automation uses Node: the local Bun Windows pipe transport failed
// the minimal launch/data-page reproduction. Bun remains the HTTP server.
const prepared = spawnSync('bun', ['prepare.ts'], {
  cwd: import.meta.dirname,
  stdio: 'inherit',
  timeout: 120_000,
})
if (prepared.error || prepared.status !== 0) {
  results.push({ phase: 'prepare', failure: String(prepared.error ?? `exit ${prepared.status}`) })
  await save()
  throw new Error(`Runtime integrity preparation failed; evidence: ${outputPath}`)
}
distribution = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'runtime-manifest.json'), 'utf8'),
)
const server = spawn('bun', ['server.ts'], {
  cwd: import.meta.dirname,
  stdio: ['ignore', 'pipe', 'inherit'],
})
const serverLines = createInterface({ input: server.stdout })

async function waitForBoot(frame: Frame) {
  await frame.waitForFunction(
    () => ['ready', 'failed'].includes(globalThis.l0?.state.status),
    undefined,
    { timeout: 30_000 },
  )
  return frame.evaluate(() => structuredClone(globalThis.l0.state))
}

async function run(frame: Frame, code: string): Promise<RunEvidence> {
  return deadline(
    frame.evaluate(
      async (source) => ({
        result: await globalThis.l0.run(source),
        output: [...globalThis.l0.state.events],
      }),
      code,
    ),
    5000,
    'Python execution',
  )
}

try {
  const serverUrl = await deadline(
    new Promise<string>((resolveUrl, reject) => {
      server.once('error', reject)
      server.once('exit', (code) => reject(new Error(`Probe server exited: ${code}`)))
      serverLines.once('line', (line) => {
        try {
          const url = new URL(JSON.parse(line).url)
          assert.equal(url.hostname, '127.0.0.1')
          assert.equal(url.protocol, 'http:')
          resolveUrl(url.origin)
        } catch (error) {
          reject(error)
        }
      })
    }),
    10_000,
    'Probe server bootstrap',
  )

  for (const profile of profiles.filter((candidate) => engineNames.includes(candidate.name))) {
    let browser: Browser | undefined
    try {
      browser = await profile.engine.launch({
        headless: process.env.L0_HEADED !== '1',
        timeout: 20_000,
        channel: profile.channel,
      })
      for (const mode of modes) {
        const record: Record<string, unknown> = {
          engine: profile.name,
          version: browser.version(),
          mode,
        }
        results.push(record)
        await save()
        const context = await browser.newContext()
        try {
          const page = await context.newPage()
          const errors: string[] = []
          const requests: { url: string; status?: number; error?: string }[] = []
          record.errors = errors
          record.requests = requests
          page.on('pageerror', (error) => {
            if (errors.length < 20) errors.push(error.message)
          })
          page.on('console', (message) => {
            if (message.type() === 'error' && errors.length < 20) errors.push(message.text())
          })
          page.on('requestfailed', (request) => {
            if (requests.length < 100)
              requests.push({ url: request.url(), error: request.failure()?.errorText })
          })
          page.on('response', (response) => {
            if (requests.length < 100)
              requests.push({ url: response.url(), status: response.status() })
          })
          await page.goto(`${serverUrl}/?mode=${mode}`, { timeout: 15_000 })
          await page
            .frameLocator('#runtime')
            .locator('body')
            .waitFor({ state: 'attached', timeout: 5000 })
          const frame = page.frames().find((candidate) => candidate.url().includes('/frame?'))
          if (!frame) throw new Error('Missing runtime frame')
          const initial = await waitForBoot(frame)
          record.initial = initial
          if (initial.status !== 'ready') {
            record.qualification = 'unsupported-topology'
          } else if (mode === 'blob-inline') {
            assert.equal(initial.boot?.control, true)
            record.qualification = 'control-passed'
          } else {
            assert.equal(initial.boot?.pyodide, '314.0.7')
            assert.ok(initial.boot?.python?.startsWith('3.14.2 '))
            const arithmetic = await run(frame, 'print(6 * 7)')
            record.arithmetic = arithmetic
            assertRun(arithmetic, ['42'])
            const suspension = await run(
              frame,
              'from pyodide.ffi import run_sync\nfrom js import l0Delay\nprint("before")\nvalue = run_sync(l0Delay(50, 42))\nprint(value)\nprint("after")',
            )
            record.suspension = suspension
            if (initial.boot?.jspi) assertRun(suspension, ['before', '42', 'after'], 45)
            else {
              assert.equal(suspension.result.ok, false)
              assert.match(suspension.result.error, /stack switching not supported/)
            }
            await frame.evaluate(() => {
              globalThis.l0
                .run(
                  'iteration = 0\nwhile True:\n    iteration += 1\n    if iteration == 1000:\n        print("loop-entered", flush=True)',
                )
                .then((result) => {
                  globalThis.l0.stoppedRun = result
                })
            })
            await frame.waitForFunction(
              () => globalThis.l0.state.events.some((event) => event.text === 'loop-entered'),
              undefined,
              { timeout: 5000 },
            )
            record.loopEntered = true
            const stopMs = await deadline(
              frame.evaluate(() => globalThis.l0.stop()),
              2000,
              'Stop',
            )
            record.stopMs = stopMs
            assert.ok(stopMs <= 250, `Stop took ${stopMs}ms`)
            const stopped = await frame.evaluate(() => globalThis.l0.stoppedRun)
            assert.equal(stopped?.error, 'stopped')
            await frame.evaluate(() => globalThis.l0.start())
            assert.equal((await waitForBoot(frame)).status, 'ready')
            const restart = await run(frame, 'print("recovered")')
            record.restart = restart
            assertRun(restart, ['recovered'])
            if (initial.boot?.jspi) {
              const input: Record<string, unknown> = {}
              const graphics: Record<string, unknown> = {}
              record.input = input
              record.graphics = graphics
              await qualifyInput(frame, input)
              await qualifyGraphics(frame, graphics)
            }
            record.qualification = initial.boot?.jspi ? 'engine-slice-passed' : 'unsupported-jspi'
          }
        } catch (error) {
          record.qualification = 'failed'
          record.failure = String(error)
        } finally {
          await save()
          console.log(
            JSON.stringify({
              engine: record.engine,
              mode,
              qualification: record.qualification,
              failure: record.failure,
            }),
          )
          await deadline(context.close(), 5000, 'Context cleanup')
        }
      }
    } catch (error) {
      results.push({
        engine: profile.name,
        phase: 'browser',
        failure: String(error),
        qualification: 'failed',
      })
      await save()
    } finally {
      if (browser) await deadline(browser.close(), 5000, 'Browser cleanup')
    }
  }
} catch (error) {
  results.push({ phase: 'harness', qualification: 'failed', failure: String(error) })
  await save()
} finally {
  serverLines.close()
  server.kill()
  if (JSON.stringify(sources) !== JSON.stringify(await hashSources()))
    results.push({
      phase: 'sources',
      qualification: 'failed',
      failure: 'Probe sources changed during execution',
    })
  await save()
}
console.log(`Evidence: ${outputPath}`)
if (
  results.some((record) => record.qualification === 'failed') ||
  !results.some((record) => record.qualification === 'engine-slice-passed')
)
  process.exitCode = 1

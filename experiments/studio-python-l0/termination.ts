import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, chromium, type Frame } from '@playwright/test'
import { deadline, finalizeEvidence, type RunEvidence } from './checks.ts'
import type {} from './probe.ts'
import { hashSources } from './source-hashes.ts'

// Separate physical reclamation evidence from the Stop ACK and security
// payload tests. Chromium may keep a terminated, busy worker alive temporarily.
const engine = process.env.L0_ENGINE ?? 'chrome'
const protectedWorkers = process.env.L0_PROTECTED_WORKERS === '1'
assert.ok(engine === 'chrome' || engine === 'edge')
const sources = await hashSources()
const output = resolve(
  import.meta.dirname,
  '../../.cache/studio-python-l0',
  `termination-${engine}-${randomUUID()}.json`,
)
const samples: Record<string, unknown>[] = []
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  engine,
  protectedWorkers,
  sources,
  samples,
}
const cases = [
  { name: 'python-loop', repetitions: 10, code: 'print("started")\nwhile True: pass' },
  {
    name: 'ignored-interrupt',
    repetitions: 3,
    code: 'import signal\nsignal.signal(signal.SIGINT, signal.SIG_IGN)\nprint("started")\nwhile True: pass',
  },
  {
    name: 'busy-descendant',
    repetitions: 3,
    code: `
from js import Worker, Blob, URL
from pyodide.ffi import to_js, create_proxy
from asyncio import Future
ack = Future()
def received(event):
    if not ack.done(): ack.set_result(True)
url = URL.createObjectURL(Blob.new(to_js(['postMessage("alive"); while (true) {}']), to_js({"type": "text/javascript"})))
child = Worker.new(url)
callback = create_proxy(received)
child.onmessage = callback
await ack
print("started")
while True: pass
`,
  },
]

async function ready(frame: Frame) {
  await frame.waitForFunction(
    () => ['ready', 'failed'].includes(globalThis.l0.state.status),
    undefined,
    { timeout: 30000 },
  )
  assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
}

try {
  for (const isolated of [false, true]) {
    const server = spawn('bun', ['server.ts'], {
      cwd: import.meta.dirname,
      env: { ...process.env, L0_ISOLATE: isolated ? '1' : '0' },
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
        'Termination server',
      )
      browser = await chromium.launch({
        channel: engine === 'edge' ? 'msedge' : 'chrome',
        headless: true,
      })
      evidence.browser = browser.version()
      const cdp = await browser.newBrowserCDPSession()
      const destroyed = new Map<string, number>()
      cdp.on('Target.targetDestroyed', ({ targetId }) => destroyed.set(targetId, performance.now()))
      await cdp.send('Target.setDiscoverTargets', { discover: true })
      const page = await browser.newPage()
      await page.goto(`${url}/?mode=blob-classic`)
      const frame = page.frames().find((item) => item.url().includes('/frame?'))
      assert.ok(frame)
      await ready(frame)
      assert.equal(await frame.evaluate(() => globalThis.crossOriginIsolated), isolated)
      // security.ts proves that the protected profile cannot construct this
      // descendant. Retain the unprotected case as a rejected-topology probe.
      for (const fixture of cases.filter(
        (item) => !protectedWorkers || item.name !== 'busy-descendant',
      )) {
        for (let iteration = 0; iteration < fixture.repetitions; iteration++) {
          const sample: Record<string, unknown> = { isolated, fixture: fixture.name, iteration }
          samples.push(sample)
          await frame.evaluate((source) => {
            globalThis.l0.stoppedRun = undefined
            void globalThis.l0.run(source).then((result) => {
              globalThis.l0.stoppedRun = result
            })
          }, fixture.code)
          await frame.waitForFunction(
            () => globalThis.l0.state.events.some((item) => item.text === 'started'),
            undefined,
            { timeout: 10000 },
          )
          const targets = (await cdp.send('Target.getTargets')).targetInfos.filter(
            (target) => target.type === 'worker',
          )
          assert.equal(targets.length, fixture.name === 'busy-descendant' ? 2 : 1)
          sample.targets = targets.map((target) => target.targetId)
          const before = await cdp.send('SystemInfo.getProcessInfo')
          const began = performance.now()
          sample.ackMs = await frame.evaluate(() => globalThis.l0.stop())
          sample.pendingResult = await frame.evaluate(() => globalThis.l0.stoppedRun)
          assert.deepEqual(sample.pendingResult, { ok: false, error: 'stopped' })
          // Diagnostic ceiling 10s, deliberately distinct from qualification
          // budgets. Preserve native timings even when the original 1s fails.
          while (targets.some((target) => !destroyed.has(target.targetId))) {
            assert.ok(
              performance.now() - began < 10000,
              'Physical termination exceeded diagnostic deadline',
            )
            await new Promise((done) => setTimeout(done, 10))
          }
          sample.destroyedAfterMs = targets.map(
            (target) => (destroyed.get(target.targetId) ?? Number.NaN) - began,
          )
          if (protectedWorkers) {
            const physicalMs = Math.max(
              ...targets.map((target) => (destroyed.get(target.targetId) ?? Infinity) - began),
            )
            sample.originalOneSecondMet = physicalMs <= 1000
            assert.ok(
              physicalMs <= 3000,
              'Protected worker exceeded proposed native reclamation budget',
            )
            // SAB is best-effort acceleration, not a separate hard bound:
            // Edge also exercised the native fallback for an ordinary loop.
            // Keep those samples and the original 1s result visible.
            sample.optionalInterruptUnderOneSecond = isolated && physicalMs <= 1000
          }
          const after = await cdp.send('SystemInfo.getProcessInfo')
          sample.rendererCpuSeconds = before.processInfo
            .filter((process) => process.type === 'renderer')
            .map((process) => {
              const current = after.processInfo.find((item) => item.id === process.id)
              return {
                id: process.id,
                delta: current ? current.cpuTime - process.cpuTime : null,
                disappeared: !current,
              }
            })
          const stoppedState: { status: string; events: RunEvidence['output'] } =
            await frame.evaluate(() => ({
              status: globalThis.l0.state.status,
              events: globalThis.l0.state.events,
            }))
          assert.deepEqual(stoppedState, {
            status: 'stopped',
            events: [{ type: 'stdout', text: 'started' }],
          })
          sample.noOutputAfterStop = true
          await frame.evaluate(() => globalThis.l0.start())
          await ready(frame)
          assert.equal((await frame.evaluate(() => globalThis.l0.run('print(42)'))).ok, true)
          await frame.evaluate(() => {
            globalThis.l0.stop()
            globalThis.l0.start()
          })
          await ready(frame)
          console.log(
            JSON.stringify({
              isolated,
              fixture: fixture.name,
              iteration,
              ackMs: sample.ackMs,
              destroyedAfterMs: sample.destroyedAfterMs,
            }),
          )
        }
      }
    } finally {
      try {
        if (browser) await deadline(browser.close(), 5000, 'Termination browser close')
      } finally {
        lines.close()
        server.kill()
      }
    }
  }
  evidence.qualification = 'measurement-complete-not-original-one-second-pass'
} catch (error) {
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  if (JSON.stringify(sources) !== JSON.stringify(await hashSources())) {
    evidence.failure = 'Sources changed during measurement'
    process.exitCode = 1
  }
  await mkdir(resolve(output, '..'), { recursive: true })
  finalizeEvidence(evidence)
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ output, failure: evidence.failure }))
}

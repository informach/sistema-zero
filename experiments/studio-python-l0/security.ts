import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, chromium, type Frame } from '@playwright/test'
import { assertRun, deadline, finalizeEvidence } from './checks.ts'
import type {} from './probe.ts'
import { hashSources } from './source-hashes.ts'

const engine = process.env.L0_ENGINE ?? 'chrome'
const protectedWorkers = process.env.L0_PROTECTED_WORKERS === '1'
assert.ok(engine === 'chrome' || engine === 'edge')
const output = resolve(
  import.meta.dirname,
  '../../.cache/studio-python-l0',
  `security-${engine}-${randomUUID()}.json`,
)
await mkdir(resolve(output, '..'), { recursive: true })
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  engine,
  protectedWorkers,
  scope: 'L0 browser boundary slices, not production protocol or OOM immunity',
  qualification: 'in-progress',
}
const sources = await hashSources()
evidence.sources = sources
let attempts = 0
const canary = createServer((_request, response) => {
  attempts++
  response.writeHead(200, { 'Access-Control-Allow-Origin': '*' })
  response.end('canary')
})
canary.on('upgrade', (_request, socket) => {
  attempts++
  socket.destroy()
})
await new Promise<void>((done) => canary.listen(0, '127.0.0.1', done))
const address = canary.address()
assert.ok(address && typeof address !== 'string')
const forbidden = `http://127.0.0.1:${address.port}/forbidden`
const server = spawn('bun', ['server.ts'], {
  cwd: import.meta.dirname,
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
})
const lines = createInterface({ input: server.stdout })
let browser: Browser | undefined
async function ready(frame: Frame) {
  await frame.waitForFunction(
    () => ['ready', 'failed'].includes(globalThis.l0.state.status),
    undefined,
    { timeout: 30000 },
  )
  assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
}
async function execute(frame: Frame, code: string) {
  return deadline(
    frame.evaluate(
      async (source) => ({
        result: await globalThis.l0.run(source),
        output: [...globalThis.l0.state.events],
      }),
      code,
    ),
    10000,
    'Security fixture',
  )
}
async function restart(frame: Frame) {
  await frame.evaluate(() => {
    globalThis.l0.stop()
    globalThis.l0.start()
  })
  await ready(frame)
  assertRun(await execute(frame, 'print("recovered")'), ['recovered'])
}
try {
  const host = await deadline(
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
    'Security server',
  )
  browser = await chromium.launch({
    channel: engine === 'edge' ? 'msedge' : 'chrome',
    headless: true,
  })
  evidence.browser = browser.version()
  const page = await browser.newPage()
  await page.goto(`${host}/?mode=blob-classic`)
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame?'))
  assert.ok(frame)
  await ready(frame)
  evidence.parentAccess = await frame.evaluate(() => {
    try {
      return { allowed: true, text: parent.document.title }
    } catch (error) {
      return { allowed: false, name: error instanceof DOMException ? error.name : String(error) }
    }
  })
  assert.deepEqual(evidence.parentAccess, { allowed: false, name: 'SecurityError' })
  const network = await execute(
    frame,
    `
from js import fetch, WebSocket
from asyncio import Future
from pyodide.ffi import create_proxy
try:
    await fetch(${JSON.stringify(forbidden)})
    print("fetch-allowed")
except Exception:
    print("fetch-blocked")
ws_result = Future()
def socket_failed(event):
    if not ws_result.done(): ws_result.set_result("websocket-blocked")
def socket_opened(event):
    if not ws_result.done(): ws_result.set_result("websocket-allowed")
on_error = create_proxy(socket_failed)
on_open = create_proxy(socket_opened)
socket = WebSocket.new(${JSON.stringify(forbidden.replace('http:', 'ws:'))})
socket.onerror = on_error
socket.onopen = on_open
print(await ws_result)
socket.close()
on_error.destroy()
on_open.destroy()
`,
  )
  evidence.network = network
  assertRun(network, ['fetch-blocked', 'websocket-blocked'])
  assert.equal(attempts, 0)
  const subworker = await execute(
    frame,
    protectedWorkers
      ? `
from js import Worker, Blob, URL, trustedTypes, Object
from pyodide.ffi import to_js, create_proxy
url = URL.createObjectURL(Blob.new(to_js(['postMessage("alive"); while(true) {}']), to_js({"type": "text/javascript"})))
try:
    Worker.new(url)
    print("child-allowed")
except Exception:
    print("child-blocked")
for name in ["sz-python-bootstrap", "default", "attacker"]:
    try:
        trustedTypes.createPolicy(name, Object.new())
        print("policy-allowed:" + name)
    except Exception:
        print("policy-blocked:" + name)
URL.revokeObjectURL(url)
`
      : `
from js import Worker, Blob, URL
from pyodide.ffi import to_js, create_proxy
from asyncio import Future
ack = Future()
def received(event):
    if not ack.done():
        ack.set_result(True)
url = URL.createObjectURL(Blob.new(to_js(['postMessage("alive"); setInterval(() => {}, 1000)']), to_js({"type": "text/javascript"})))
child = Worker.new(url)
callback = create_proxy(received)
child.onmessage = callback
await ack
print("child-confirmed")
`,
  )
  evidence.subworker = subworker
  assertRun(
    subworker,
    protectedWorkers
      ? [
          'child-blocked',
          'policy-blocked:sz-python-bootstrap',
          'policy-blocked:default',
          'policy-blocked:attacker',
        ]
      : ['child-confirmed'],
  )
  const cdp = await browser.newBrowserCDPSession()
  const workers = async () =>
    (await cdp.send('Target.getTargets')).targetInfos.filter((target) => target.type === 'worker')
  const cleanupTargets: Record<string, unknown>[] = []
  evidence.cleanupTargets = cleanupTargets
  async function waitForWorkersGone(label: string) {
    const began = performance.now()
    while (true) {
      const remaining = await deadline(workers(), 1000, 'Worker inspection')
      if (cleanupTargets.length < 200)
        cleanupTargets.push({ label, elapsedMs: performance.now() - began, remaining })
      if (remaining.length === 0) return
      assert.ok(performance.now() - began < 1000, `${label}: workers remained after one second`)
      await new Promise((done) => setTimeout(done, 10))
    }
  }
  evidence.targetsBeforeStop = (await workers()).length
  assert.equal(evidence.targetsBeforeStop, protectedWorkers ? 1 : 2)
  const stoppedAt = performance.now()
  evidence.stopMs = await frame.evaluate(() => globalThis.l0.stop())
  await waitForWorkersGone('Descendant worker cleanup')
  evidence.allWorkersGoneMs = performance.now() - stoppedAt
  await restart(frame)
  const malformed = await execute(
    frame,
    'from js import l0Pump\nfrom pyodide.ffi import run_sync\nrun_sync(l0Pump(\'[["line",0,0,"bad",1,"red"]]\', 0))',
  )
  evidence.malformedDrawing = malformed
  assert.equal(malformed.result.ok, false)
  assert.match(malformed.result.error ?? '', /Invalid L0 line/)
  await restart(frame)
  const pressure = await execute(
    frame,
    'buffer = bytearray(32 * 1024 * 1024)\nbuffer[-1] = 42\nprint(buffer[-1])',
  )
  evidence.boundedAllocation = pressure
  assertRun(pressure, ['42'])
  await restart(frame)
  // Exercise actual FFI messages, not only the cooperative stdout callback.
  const flood = await execute(
    frame,
    'from js import postMessage\nfrom pyodide.ffi import to_js\nmessage = to_js({"type":"stdout", "text":"x" * 4000})\nfor i in range(10000):\n    postMessage(message)',
  )
  evidence.flood = {
    result: flood.result,
    retainedLogs: flood.output.length,
    retainedCharacters: flood.output.reduce((sum, item) => sum + item.text.length, 0),
  }
  assert.equal(flood.result.ok, false)
  assert.match(flood.result.error ?? '', /message quota/)
  assert.ok(flood.output.length <= 100)
  await restart(frame)
  const primitiveFlood = await execute(
    frame,
    'from js import postMessage\nfor i in range(10000):\n    postMessage("untyped" if i % 2 else None)',
  )
  evidence.primitiveFlood = primitiveFlood
  assert.equal(primitiveFlood.result.ok, false)
  assert.match(primitiveFlood.result.error ?? '', /message quota/)
  await restart(frame)
  for (const type of ['boot-error', 'result']) {
    const malformedError = await execute(
      frame,
      `from js import postMessage, JSON\npayload = JSON.parse(${JSON.stringify(JSON.stringify({ type, id: 0, ok: false, error: { toString: null, valueOf: null } }))})\nfor request in range(1, 100):\n    payload.id = request\n    postMessage(payload)`,
    )
    evidence[`malformed-${type}`] = malformedError
    assert.equal(malformedError.result.ok, false)
    assert.match(malformedError.result.error ?? '', /Invalid runtime error payload/)
    await waitForWorkersGone(`Malformed ${type} worker cleanup`)
    await restart(frame)
  }
  if (protectedWorkers) {
    const rejectedModes: string[] = []
    evidence.rejectedModes = rejectedModes
    for (const mode of ['direct', 'blob', 'blob-inline']) {
      const unsupported = await browser.newPage()
      try {
        await unsupported.goto(`${host}/?mode=${mode}`)
        const unsupportedFrame = unsupported.frames().find((item) => item.url().includes('/frame?'))
        assert.ok(unsupportedFrame)
        await unsupportedFrame.waitForFunction(
          () => globalThis.l0?.state.status === 'failed',
          undefined,
          { timeout: 5000 },
        )
        assert.match(
          await unsupportedFrame.evaluate(() => globalThis.l0.state.error ?? ''),
          /qualified classic bootstrap/,
        )
        assert.equal((await workers()).length, 1, 'Rejected topology must not start a worker')
        rejectedModes.push(mode)
      } finally {
        await unsupported.close()
      }
    }
  }
  evidence.qualification = 'boundary-slices-passed'
} catch (error) {
  evidence.qualification = 'failed'
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  evidence.forbiddenRequestsReceived = attempts
  if (browser) {
    try {
      await deadline(browser.close(), 5000, 'Security browser close')
    } catch (error) {
      evidence.cleanupFailure = String(error)
      process.exitCode = 1
    }
  }
  lines.close()
  server.kill()
  await new Promise<void>((done) => canary.close(() => done()))
  if (JSON.stringify(sources) !== JSON.stringify(await hashSources())) {
    evidence.qualification = 'failed-sources-changed'
    process.exitCode = 1
  }
  finalizeEvidence(evidence)
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(
    JSON.stringify({ output, qualification: evidence.qualification, failure: evidence.failure }),
  )
}

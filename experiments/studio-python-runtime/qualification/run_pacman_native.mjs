/** No browser/Tk during preflight. Native admission requires a future absolute UTC deadline. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [python, artifact, output, scenario, windowEnd] = process.argv.slice(2)
assert(
  python && artifact && output && ['geometry', 'ai'].includes(scenario) && windowEnd,
  'Usage: node run_pacman_native.mjs <python> <canonical-pacman-dir> <new-output> <geometry|ai> <UTC-window-end|preflight>',
)
const preflight = windowEnd === 'preflight'
const childBudgetMs = 20_000
let deadlineUtc
if (!preflight) {
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(windowEnd),
    'Explicit UTC ISO deadline required',
  )
  deadlineUtc = Date.parse(windowEnd)
  assert(Number.isFinite(deadlineUtc), 'Invalid UTC deadline')
  assert(
    new Date(deadlineUtc).toISOString() === windowEnd.replace(/(?<=:\d{2})Z$/, '.000Z'),
    'Invalid UTC date',
  )
  assert(
    deadlineUtc - Date.now() >= childBudgetMs,
    'Authorized window expired or too short for one bounded child',
  )
}
const here = dirname(fileURLToPath(import.meta.url))
const script = resolve(here, 'pacman_native.py')
const target = resolve(output)
const sha = (data) => createHash('sha256').update(data).digest('hex')
const argv = [
  '-I',
  '-B',
  script,
  '--artifact-dir',
  resolve(artifact),
  '--output',
  resolve(target, 'result'),
  '--scenario',
  scenario,
  ...(preflight ? ['--preflight'] : []),
]
const report = {
  state: 'running',
  node: process.versions.node,
  python: resolve(python),
  argv,
  scenario,
  preflightOnly: preflight,
  absoluteWindowEnd: preflight ? null : windowEnd,
  childBudgetMs,
  runnerSha256: sha(readFileSync(script)),
  observerSourceSha256: sha(readFileSync(resolve(here, 'pacman_functional_observer.py'))),
  startedAt: new Date().toISOString(),
  pid: null,
  deadline: false,
  signalAttempted: false,
}
// Recheck immediately before the only process creation; no resources are reserved while waiting.
if (!preflight)
  assert(
    deadlineUtc - Date.now() >= childBudgetMs,
    'Authorized window became too short before spawn',
  )
mkdirSync(target)
const out = openSync(resolve(target, 'stdout.log'), 'wx')
const err = openSync(resolve(target, 'stderr.log'), 'wx')
const child = spawn(report.python, argv, {
  cwd: here,
  windowsHide: true,
  stdio: ['ignore', out, err],
})
report.pid = child.pid ?? null
writeFileSync(resolve(target, 'owner.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
let spawnError
child.once('error', (error) => {
  spawnError = String(error)
})
const deadline = setTimeout(
  () => {
    report.deadline = true
    report.signalAttempted = true
    report.signalDelivered = child.kill() // Only the directly owned handle; never graceful completion evidence.
  },
  preflight ? childBudgetMs : Math.min(childBudgetMs, deadlineUtc - Date.now()),
)
const [exitCode, exitSignal] = await new Promise((done) =>
  child.once('close', (code, signal) => done([code, signal])),
)
clearTimeout(deadline)
closeSync(out)
closeSync(err)
Object.assign(report, {
  exitCode,
  exitSignal,
  spawnError: spawnError ?? null,
  endedAt: new Date().toISOString(),
})
report.state = 'failed-or-incomplete-preserved'
try {
  if (exitCode === 0 && !report.deadline && !report.signalAttempted && !spawnError) {
    const bytes = readFileSync(resolve(target, 'result/native.json'))
    const result = JSON.parse(bytes)
    assert.equal(result.runnerSha256, report.runnerSha256)
    assert.equal(result.observerSourceSha256, report.observerSourceSha256)
    assert.equal(result.scenario, scenario)
    assert.equal(result.preflightOnly, preflight)
    assert.deepEqual(result.errors, [])
    if (preflight) {
      assert.equal(result.state, 'preflight-passed-no-Tk')
      assert.equal(result.rootMapEvents, 0)
      assert.equal(result.rootDestroyEvents, 0)
    } else {
      assert.equal(result.state, 'native-functional-passed')
      assert.equal(result.rootMapEvents, 0)
      assert.equal(result.rootDestroyEvents, 1)
      assert.equal(result.boundedFunctionalCompletion, true)
      assert.equal(result.cooperativeDeadline, false)
      assert.equal(result.audioReleased, true)
      assert.equal(result.ownedTempAbsent, true)
      assert.equal(result.exportTreeUnchanged, true)
      assert.equal(result.passedCases.length, scenario === 'geometry' ? 32 : 10)
      assert(Date.parse(report.endedAt) <= deadlineUtc, 'Child outlived authorized window')
    }
    report.state = result.state
    report.nativeReceiptSha256 = sha(bytes)
  }
} catch (error) {
  report.receiptError = String(error)
}
writeFileSync(resolve(target, 'supervisor.json'), `${JSON.stringify(report, null, 2)}\n`, {
  flag: 'wx',
})
console.log(JSON.stringify(report))
process.exitCode = ['preflight-passed-no-Tk', 'native-functional-passed'].includes(report.state)
  ? 0
  : 1

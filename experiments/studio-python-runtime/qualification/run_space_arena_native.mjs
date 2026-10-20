/** One owned child and immutable, exclusive outputs. An external timeout is a failure. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [python, artifact, output, scenario] = process.argv.slice(2)
assert(
  python && artifact && output && /^Q0[2-7]$/.test(scenario),
  'Usage: node run_space_arena_native.mjs <python> <canonical-dir> <new-output-dir> <Q02..Q07>',
)
const here = dirname(fileURLToPath(import.meta.url))
const destination = resolve(output)
mkdirSync(destination, { recursive: false })
const digest = (value) => createHash('sha256').update(value).digest('hex')
const script = resolve(here, 'space_arena_native.py')
const argv = [
  '-I',
  '-B',
  script,
  '--artifact-dir',
  resolve(artifact),
  '--output',
  resolve(destination, 'result'),
  '--scenario',
  scenario,
]
const report = {
  state: 'running',
  node: process.versions.node,
  python: resolve(python),
  argv,
  scenario,
  runnerSha256: digest(readFileSync(script)),
  observerSha256: digest(readFileSync(resolve(here, 'space_arena_observer.py'))),
  startedAt: new Date().toISOString(),
  pid: null,
  deadline: false,
  signalAttempted: false,
}
const out = openSync(resolve(destination, 'stdout.log'), 'wx')
const err = openSync(resolve(destination, 'stderr.log'), 'wx')
const child = spawn(report.python, argv, {
  cwd: here,
  windowsHide: true,
  stdio: ['ignore', out, err],
})
report.pid = child.pid ?? null
writeFileSync(resolve(destination, 'owner.json'), `${JSON.stringify(report, null, 2)}\n`, {
  flag: 'wx',
})
let spawnError
child.once('error', (error) => {
  spawnError = String(error)
})
const deadline = setTimeout(() => {
  report.deadline = true
  report.signalAttempted = true
  report.signalDelivered = child.kill() // Only the directly owned child handle.
}, 40_000)
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
    const bytes = readFileSync(resolve(destination, 'result/native.json'))
    const result = JSON.parse(bytes)
    assert.equal(result.state, 'native-functional-passed')
    assert.equal(result.runnerSha256, report.runnerSha256)
    assert.equal(result.observerSha256, report.observerSha256)
    assert.equal(result.scenario, scenario)
    assert.equal(result.rootMapEvents, 0)
    assert.equal(result.rootDestroyEvents, 1)
    assert.equal(result.audioReleased, true)
    assert.equal(result.ownedTempAbsent, true)
    assert.equal(result.exportTreeUnchanged, true)
    assert.deepEqual(result.errors, [])
    if (scenario === 'Q03') {
      const lines = readFileSync(resolve(destination, 'stdout.log'), 'utf8').split(/\r?\n/)
      assert.equal(lines.filter((line) => line === 'GAME OVER').length, 1)
    }
    report.nativeReceiptSha256 = digest(bytes)
    report.state = 'native-functional-passed'
  }
} catch (error) {
  report.receiptError = String(error)
}
writeFileSync(resolve(destination, 'supervisor.json'), `${JSON.stringify(report, null, 2)}\n`, {
  flag: 'wx',
})
console.log(JSON.stringify(report))
process.exitCode = report.state === 'native-functional-passed' ? 0 : 1

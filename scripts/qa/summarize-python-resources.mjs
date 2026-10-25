import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(process.argv[2])
const attempts = await readdir(root, { withFileTypes: true })
assert.equal(attempts.length, 1, 'Qualification requires one fresh full attempt')
assert.ok(attempts[0].isDirectory())
const attempt = path.join(root, attempts[0].name)
const rows = []
for (const dir of await readdir(attempt, { withFileTypes: true })) {
  assert.ok(dir.isDirectory())
  const read = async (name) =>
    JSON.parse(await readFile(path.join(attempt, dir.name, name), 'utf8'))
  const metrics = await read('resource-usage.json')
  const cleanup = await read('cleanup.json')
  const judge = await read('judge.json')
  assert.equal(cleanup.confirmed, true)
  assert.equal(metrics.exitCode, 0)
  assert.equal(metrics.signal, null)
  assert.equal(metrics.spawnError, null)
  assert.equal(metrics.memoryLimitBytes, 1024 ** 3)
  assert.equal(metrics.pidsLimit, 256)
  assert.equal(metrics.cpuQuotaCores, 1)
  assert.equal(metrics.oom, 0)
  assert.equal(metrics.oomKill, 0)
  assert.ok(judge.results.length > 0)
  assert.ok(judge.results.every((result) => result.passed === judge.expected))
  rows.push({ name: dir.name, expected: judge.expected, ...metrics, cleanup: true })
  console.log(JSON.stringify({ case: dir.name, ...metrics, cleanup: true }))
}
assert.ok(rows.length >= 30, 'Full positive and negative scenario selection is required')
const summary = {
  measuredAt: new Date().toISOString(),
  source: process.env.GITHUB_SHA,
  host: {
    platform: os.platform(),
    release: os.release(),
    totalMemoryBytes: os.totalmem(),
    processors: os.availableParallelism(),
    node: process.version,
  },
  scope:
    'Fresh process per case, one CPU/1 GiB container cap, no cold/warm or student-machine performance acceptance claimed',
  scenarios: rows.length,
  maximumContainerPeakBytes: Math.max(...rows.map((row) => row.memoryPeakBytes)),
  maximumElapsedMs: Math.max(...rows.map((row) => row.elapsedMs)),
  rows,
}
await writeFile(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' })
console.log(
  JSON.stringify({
    scenarios: summary.scenarios,
    maximumContainerPeakBytes: summary.maximumContainerPeakBytes,
    maximumElapsedMs: summary.maximumElapsedMs,
    cleanups: rows.every((row) => row.cleanup),
  }),
)

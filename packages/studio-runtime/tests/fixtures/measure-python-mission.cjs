// Trusted QA wrapper only. The learner still runs in the unchanged protected runner.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const { performance } = require('node:perf_hooks')

function read(name) {
  return fs.readFileSync(`/sys/fs/cgroup/${name}`, 'utf8').trim()
}
function counters(name) {
  return Object.fromEntries(
    read(name)
      .split('\n')
      .map((line) => {
        const [key, value] = line.trim().split(/\s+/)
        return [key, Number(value)]
      }),
  )
}
const before = counters('cpu.stat')
const started = performance.now()
const child = spawnSync(process.execPath, ['/opt/sz-runtime/python-mission.mjs'], {
  stdio: 'inherit',
  timeout: 125_000,
})
const after = counters('cpu.stat')
const events = counters('memory.events')
const cpuMax = read('cpu.max')
const [quota, period] = cpuMax.split(/\s+/).map(Number)
const measurement = {
  version: 1,
  scope:
    'Fresh protected Chromium/Pyodide process; total QA-container cgroup, not student-device RAM',
  elapsedMs: Math.round(performance.now() - started),
  memoryPeakBytes: Number(read('memory.peak')),
  memoryLimitBytes: Number(read('memory.max')),
  cpuMax,
  cpuQuotaCores: quota / period,
  cpuUsageMicroseconds: after.usage_usec - before.usage_usec,
  pidsLimit: Number(read('pids.max')),
  oom: events.oom ?? 0,
  oomKill: events.oom_kill ?? 0,
  exitCode: child.status,
  signal: child.signal,
  spawnError: child.error?.code ?? null,
}
fs.writeFileSync('resource-usage.json', JSON.stringify(measurement, null, 2), { flag: 'wx' })
assert.equal(measurement.memoryLimitBytes, 1024 ** 3)
assert.equal(measurement.pidsLimit, 256)
assert.equal(measurement.cpuQuotaCores, 1)
assert.equal(measurement.oom, 0)
assert.equal(measurement.oomKill, 0)
assert.ok(
  measurement.memoryPeakBytes > 0 && measurement.memoryPeakBytes <= measurement.memoryLimitBytes,
)
assert.equal(child.signal, null)
assert.equal(child.error, undefined)
process.exit(child.status ?? 1)

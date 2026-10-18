import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { runOwnedProcess } from './reference-process.mjs'

test('Windows timeout terminates the owned parent and a live descendant', {
  skip: process.platform !== 'win32',
  timeout: 20000,
}, async () => {
  const folder = await mkdtemp(join(tmpdir(), 'sz-reference-timeout-'))
  const marker = join(folder, 'started.json')
  const source = `
    const {spawn} = require('node:child_process');
    const {writeFileSync} = require('node:fs');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio:'ignore', windowsHide:true});
    child.once('spawn', () => writeFileSync(process.env.L0_TEST_MARKER, JSON.stringify({parent:process.pid, child:child.pid})));
    setInterval(() => {}, 1000);
  `
  const result = await runOwnedProcess(
    process.execPath,
    ['-e', source],
    { env: { ...process.env, L0_TEST_MARKER: marker }, stdio: 'ignore' },
    3000,
  )
  const pids = JSON.parse(await readFile(marker, 'utf8'))
  assert.equal(result.timedOut, true)
  assert.equal(result.cleanupFailure, undefined)
  for (const pid of [pids.parent, pids.child])
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
})

test('successful owned process is not reported as timed out', { timeout: 10000 }, async () => {
  const result = await runOwnedProcess(
    process.execPath,
    ['-e', 'process.exit(0)'],
    { stdio: 'ignore' },
    5000,
  )
  assert.equal(result.code, 0)
  assert.equal(result.timedOut, false)
  assert.equal(result.cleanupFailure, undefined)
})

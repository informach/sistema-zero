import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { hookCanary } from './lsp-hook.ts'

test('an entered hook remains detectable even if its imports fail', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-l0-hook-canary-'))
  try {
    const marker = join(root, 'entered.txt')
    const python = resolve(
      import.meta.dirname,
      '../../.cache/studio-python-l0/cpython-3.14.2/python.exe',
    )
    const result = spawnSync(
      python,
      ['-I', '-c', `${hookCanary(marker)}import l0_module_that_does_not_exist\n`],
      { encoding: 'utf8', timeout: 10000, windowsHide: true },
    )
    assert.equal(result.error, undefined)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /ModuleNotFoundError/)
    assert.equal(await readFile(marker, 'utf8'), 'entered')
  } finally {
    await rm(root, { recursive: true })
  }
})

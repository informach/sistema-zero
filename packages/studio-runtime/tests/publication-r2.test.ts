import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runOwnedNodeProcess } from './fixtures/owned-node-process'

test('native R2 updates, restores and retires publication pointers without losing CAS protection', async () => {
  const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
  if (!node) throw new Error('Node is required for the native R2 publication proof')
  const directory = await mkdtemp(join(tmpdir(), 'sz-publication-r2-'))
  const worker = join(directory, 'worker.mjs')
  const report = join(directory, 'report.json')
  let retired = true
  const errors: unknown[] = []
  try {
    // Keep the native fixture compiler out of the test runner's shared module graph.
    // A second in-process Bun.build in the complete Windows suite could no longer read
    // the core/zod entrypoints, although both native proofs passed in isolation.
    retired = false
    const compilation = await runOwnedNodeProcess({
      command: [
        process.execPath,
        'build',
        resolve(import.meta.dirname, 'fixtures/publication-r2-worker.ts'),
        '--target=browser',
        '--format=esm',
        '--outfile',
        worker,
      ],
      timeoutMs: 30000,
    })
    retired = compilation.retired
    if (compilation.failure) throw compilation.failure
    expect(compilation.exit, `${compilation.stdout}\n${compilation.stderr}`).toBe(0)
    retired = false
    const child = await runOwnedNodeProcess({
      command: [node, resolve(import.meta.dirname, 'fixtures/publication-r2.mjs'), worker, report],
      timeoutMs: 45000,
    })
    retired = child.retired
    if (child.failure) throw child.failure
    expect(child.exit, `${child.stdout}\n${child.stderr}`).toBe(0)
    const result = JSON.parse(await readFile(report, 'utf8'))
    expect(result.status, JSON.stringify(result.value)).toBe(200)
    expect(result.cleanupConfirmed).toBe(true)
    expect(result.value).toEqual({
      firstVersion: 1,
      secondVersion: 2,
      replayVersion: 2,
      sameLink: true,
      historyLength: 2,
      staleRefused: true,
      updatedSource: true,
      disabled: true,
      disabledSource: true,
      restoredVersion: 4,
      restoredSource: true,
      retiredSource: true,
      purgedSource: true,
    })
  } catch (error) {
    errors.push(error)
  } finally {
    if (!retired)
      errors.push(new Error(`Owned process retirement unconfirmed; inputs kept at ${directory}`))
    else
      try {
        for (const file of [worker, report])
          await unlink(file).catch((error: unknown) => {
            if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
              throw error
          })
        await rmdir(directory)
      } catch (cleanupError) {
        errors.push(cleanupError)
      }
  }
  if (errors.length) throw new AggregateError(errors, 'Native R2 publication proof failed')
}, 60000)

import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runOwnedNodeProcess } from './fixtures/owned-node-process'

const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
if (!node) throw new Error('Node is required for native child ownership tests')
const fixture = resolve(import.meta.dirname, 'fixtures/noncooperative-node-process.mjs')

test('owned native process collects output and exit acknowledgement', async () => {
  const result = await runOwnedNodeProcess({ command: [node, fixture, 'normal'], timeoutMs: 5000 })
  expect(result).toEqual({
    exit: 0,
    stdout: 'completed\n',
    stderr: '',
    retired: true,
    failure: undefined,
  })
})

test('parent deadline retires a noncooperative native child and its grandchild before input removal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sz-owned-node-'))
  const input = join(directory, 'input.txt')
  const marker = join(directory, 'ready.json')
  let retired = true
  const errors: unknown[] = []
  try {
    await writeFile(input, 'owned input retained through termination')
    retired = false
    const started = performance.now()
    const result = await runOwnedNodeProcess({
      command: [node, fixture, 'hang', input, marker],
      timeoutMs: 4000,
    })
    retired = result.retired
    expect(result.failure).toBeInstanceOf(Error)
    expect(String(result.failure)).toContain('deadline expired')
    expect(result.retired).toBe(true)
    expect(performance.now() - started).toBeLessThan(9500)
    const evidence = JSON.parse(await readFile(marker, 'utf8'))
    expect(evidence.retainedInput).toBe(await readFile(input, 'utf8'))
    for (const pid of [evidence.parent, evidence.grandchild]) {
      expect(() => process.kill(pid, 0)).toThrow()
    }
  } catch (error) {
    errors.push(error)
  } finally {
    if (!retired)
      errors.push(new Error(`Native process retirement unconfirmed; preserved ${directory}`))
    else
      try {
        for (const path of [input, marker]) {
          await unlink(path).catch((error: unknown) => {
            if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
              throw error
          })
        }
        await rmdir(directory)
      } catch (error) {
        errors.push(error)
      }
  }
  if (errors.length) throw new AggregateError(errors, 'Native ownership proof failed')
}, 15000)

test('output overflow is bounded and retires the owned native process', async () => {
  const result = await runOwnedNodeProcess({
    command: [node, fixture, 'overflow'],
    timeoutMs: 5000,
  })
  expect(result.retired).toBe(true)
  expect(String(result.failure)).toContain('exceeded 64 KiB')
  expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(65536)
})

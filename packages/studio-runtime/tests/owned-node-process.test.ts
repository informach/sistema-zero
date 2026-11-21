import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runOwnedNodeProcess } from './fixtures/owned-node-process'

const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
if (!node) throw new Error('Node is required for native child ownership tests')
const fixture = resolve(import.meta.dirname, 'fixtures/noncooperative-node-process.mjs')

function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

/** Linux process state letter, or undefined once the process entry is gone. */
function linuxProcessState(pid: number): string | undefined {
  let stat: string
  try {
    stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
  } catch (error) {
    if (hasCode(error, 'ENOENT')) return undefined
    throw error
  }
  // "pid (comm) S ...": the command may contain spaces or parentheses; the state follows the last ")".
  const end = stat.lastIndexOf(')')
  return stat.slice(end + 2, end + 3)
}

/**
 * Whether the process still runs. `kill(pid, 0)` alone is not proof: a killed orphan (the
 * grandchild here) stays a zombie until its new parent reaps it, and the signal probe succeeds
 * on a zombie. A zombie has already exited and closed every file, so it counts as retired.
 */
function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
  } catch (error) {
    if (hasCode(error, 'ESRCH')) return false
    throw error
  }
  if (process.platform !== 'linux') return true
  const state = linuxProcessState(pid)
  return state !== undefined && state !== 'Z' && state !== 'X'
}

test.skipIf(process.platform !== 'linux')(
  'a zombie answers the signal probe but no longer runs',
  async () => {
    // `sleep 0` exits at once; its parent becomes `sleep 2` through exec and never reaps it.
    // Both sleeps leave stdout, so reading it ends right after the pid instead of in 2 s.
    const shell = Bun.spawn(['sh', '-c', 'sleep 0 >/dev/null & echo $!; exec sleep 2 >/dev/null'], {
      stdout: 'pipe',
    })
    const zombie = Number((await new Response(shell.stdout).text()).trim())
    try {
      for (
        let state = linuxProcessState(zombie);
        state !== 'Z';
        state = linuxProcessState(zombie)
      ) {
        if (state === undefined) throw new Error('The zombie was reaped before the probe')
        await Bun.sleep(5)
      }
      expect(() => process.kill(zombie, 0)).not.toThrow()
      expect(processIsRunning(zombie)).toBe(false)
      expect(processIsRunning(shell.pid)).toBe(true)
    } finally {
      shell.kill('SIGKILL')
      await shell.exited
    }
  },
)

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
      expect(processIsRunning(pid)).toBe(false)
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

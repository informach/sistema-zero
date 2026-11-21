import { expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { linuxProcessIsRetired, nativeProcessIsRetired } from './fixtures/native-process-state'

function bounded<T>(operation: Promise<T>, ms = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Owned observation deadline')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

test('Linux terminal state is distinct from a live or stopped PID, including names with parentheses', () => {
  for (const state of ['Z', 'X', 'x'])
    expect(linuxProcessIsRetired(`23 (a tricky ) name) ${state} 1 2 3`)).toBe(true)
  for (const state of ['R', 'S', 'D', 'T', 't', 'I'])
    expect(linuxProcessIsRetired(`23 (fake Z ) name) ${state} 1 2 3`)).toBe(false)
  for (const value of ['', '23 (unterminated', '23 (name) ? 1 2'])
    expect(() => linuxProcessIsRetired(value)).toThrow()
})

test('an actual running process is never accepted as retired', async () => {
  expect(await nativeProcessIsRetired(process.pid)).toBe(false)
})

test('invalid process ids are refused before any process probe', async () => {
  for (const pid of [-1, 0, 1.5, Infinity, 2147483648])
    await expect(nativeProcessIsRetired(pid)).rejects.toThrow()
})

test.skipIf(process.platform !== 'linux')(
  'a controlled Linux zombie is retired while its stopped owner is still alive',
  async () => {
    const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
    if (!node) throw new Error('Node is required for the Linux ownership proof')
    const owner = spawn(
      node,
      [resolve(import.meta.dirname, 'fixtures/controlled-zombie-owner.mjs')],
      { detached: true, stdio: ['ignore', 'pipe', 'inherit'] },
    )
    if (!owner.stdout || !owner.pid) throw new Error('Owned process did not expose its pipe/pid')
    const pid = owner.pid,
      exited = once(owner, 'exit'),
      reader = createInterface({ input: owner.stdout }),
      lines = reader[Symbol.asyncIterator]()
    const errors: unknown[] = []
    try {
      const line = await bounded(lines.next())
      if (line.done) throw new Error('Owned process ended before readiness')
      const child = JSON.parse(line.value).child
      if (!Number.isSafeInteger(child) || child < 1) throw new Error('Invalid owned child id')
      process.kill(pid, 'SIGSTOP')
      process.kill(child, 'SIGKILL')
      const until = performance.now() + 2500
      let zombie = false
      do {
        const stat = await readFile(`/proc/${child}/stat`, 'utf8')
        if (/\) Z\s/.test(stat)) {
          zombie = true
          break
        }
        await Bun.sleep(10)
      } while (performance.now() < until)
      expect(zombie).toBe(true)
      // The previous assertion would fail here even though the child cannot run/access input.
      expect(process.kill(child, 0)).toBe(true)
      expect(await nativeProcessIsRetired(child)).toBe(true)
      expect(await nativeProcessIsRetired(pid)).toBe(false)
    } catch (error) {
      errors.push(error)
    } finally {
      try {
        process.kill(pid, 'SIGCONT')
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH'))
          errors.push(error)
      }
      try {
        await bounded(exited, 2000)
      } catch (error) {
        errors.push(error)
        try {
          process.kill(-pid, 'SIGKILL')
        } catch (killError) {
          if (
            !(
              killError &&
              typeof killError === 'object' &&
              'code' in killError &&
              killError.code === 'ESRCH'
            )
          )
            errors.push(killError)
        }
        await bounded(exited, 3000).catch((cleanupError) => errors.push(cleanupError))
      } finally {
        reader.close()
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Controlled Linux retirement proof failed')
  },
  15000,
)

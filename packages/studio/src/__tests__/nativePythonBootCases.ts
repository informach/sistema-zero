import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const NATIVE_PYTHON_BOOT_TIMEOUT_MS = 25_000
const CHILD_DEADLINE_MS = 20_000
const OUTPUT_LIMIT = 64_000

async function outputTail(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let tail = ''
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) return (tail + decoder.decode()).slice(-OUTPUT_LIMIT)
      tail = (tail + decoder.decode(next.value, { stream: true })).slice(-OUTPUT_LIMIT)
    }
  } finally {
    reader.releaseLock()
  }
}

/** Always runs the native contracts, including during plain `bun test` in CI. No skip/fallback to Bun. */
export async function runNativePythonBootCases(suite: 'web-files' | 'reader-ownership') {
  const expected = suite === 'web-files' ? 3 : 2
  const temporaryRoot = resolve(tmpdir())
  const directory = await mkdtemp(join(temporaryRoot, 'studio-native-python-'))
  if (!resolve(directory).startsWith(temporaryRoot + sep)) throw new Error('Unsafe fixture path')
  let child: Pick<ReturnType<typeof Bun.spawn>, 'exitCode' | 'kill' | 'exited'> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const errors: unknown[] = []
  let expired = false
  try {
    const nativeChild = Bun.spawn(
      [
        process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
        '--test-reporter=tap',
        fileURLToPath(new URL('./nativePythonBootRunner.mjs', import.meta.url)),
        suite,
        directory,
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
        windowsHide: true,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      },
    )
    child = nativeChild
    timer = setTimeout(() => {
      expired = true
      nativeChild.kill()
    }, CHILD_DEADLINE_MS)
    const [code, stdout, stderr] = await Promise.all([
      nativeChild.exited,
      outputTail(nativeChild.stdout),
      outputTail(nativeChild.stderr),
    ])
    const output = `${stdout}\n${stderr}`.replace(/\r\n/g, '\n')
    if (
      expired ||
      code !== 0 ||
      !new RegExp(`^# tests ${expected}$`, 'm').test(output) ||
      !new RegExp(`^# pass ${expected}$`, 'm').test(output) ||
      !/^# fail 0$/m.test(output) ||
      !/^# cancelled 0$/m.test(output) ||
      !/^# skipped 0$/m.test(output)
    )
      throw new Error(
        `Native Python ${suite}: exit=${code}, deadline=${expired}\n${output.slice(-12_000)}`,
      )
    console.info(`Native Node24 ${suite}: ${expected} tests passed, 0 failed/cancelled/skipped`)
  } catch (error) {
    errors.push(error)
  } finally {
    clearTimeout(timer)
    try {
      if (child?.exitCode === null) child.kill()
      await child?.exited
    } catch (error) {
      errors.push(error)
    }
    try {
      await rm(directory, { recursive: true, force: true })
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length) throw new AggregateError(errors, `Native Python ${suite} or cleanup failed`)
}

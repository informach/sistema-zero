import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

/** The native HTTP server must not inherit HappyDOM's fetch/Response realm from UI test files. */
test('Python compiler BFF verifies its complete native HTTP/lifetime/scope suite in an isolated realm', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dirname, 'fixtures/studio-python-runtime.cases.ts'),
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    },
  )
  const deadline = setTimeout(() => child.kill(), 20_000)
  async function drain(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let tail = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return tail + decoder.decode()
        tail = (tail + decoder.decode(value, { stream: true })).slice(-20_000)
      }
    } finally {
      reader.releaseLock()
    }
  }
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      drain(child.stdout),
      drain(child.stderr),
    ])
    const output = Bun.stripANSI(`${stdout}\n${stderr}`)
    if (exit !== 0) throw new Error(`Native Python HTTP cases failed (${exit}):\n${output}`)
    expect(output).toMatch(/\b[1-9]\d* pass\b/)
    expect(output).toMatch(/\b0 fail\b/)
    expect(output).toMatch(/\b[1-9]\d* expect\(\) calls\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 22_000)

import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('standalone lifecycle cases use a separate module realm from the real interpreter tests', async () => {
  const child = Bun.spawn([process.execPath, 'test', './src/runtime/python/standalone.cases.ts'], {
    cwd: resolve(import.meta.dirname, '../../..'),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  const deadline = setTimeout(() => child.kill(), 10_000)
  async function drain(stream: ReadableStream<Uint8Array>) {
    let tail = ''
    const decoder = new TextDecoder()
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return tail + decoder.decode()
        tail = (tail + decoder.decode(value, { stream: true })).slice(-16_000)
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
    if (exit !== 0) throw new Error(`Standalone lifecycle child exited ${exit}:\n${output}`)
    expect(output).toMatch(/\b[1-9]\d* pass\b/)
    expect(output).toMatch(/\b0 fail\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 12_000)

import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

async function readOutput(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let tail = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return tail + decoder.decode()
      // Drain the entire pipe, retaining a bounded failure report.
      tail = (tail + decoder.decode(value, { stream: true })).slice(-64_000)
    }
  } finally {
    reader.releaseLock()
  }
}

test('transaction fault cases run without replacing IndexedDB in other test files', async () => {
  // Bun shares module mocks across files. These cases deliberately replace
  // idb-keyval to inject transaction faults, so they own a separate module realm.
  // An explicit fixture path runs all original cases without rediscovering this wrapper.
  const child = Bun.spawn(
    [process.execPath, 'test', './src/state/__tests__/persistence.cases.ts'],
    {
      cwd: resolve(import.meta.dirname, '../..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    },
  )
  const deadline = setTimeout(() => child.kill(), 60_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      readOutput(child.stdout),
      readOutput(child.stderr),
    ])
    const output = Bun.stripANSI(`${stdout}\n${stderr}`)
    if (exit !== 0)
      throw new Error(`Isolated persistence cases exited ${exit}:\n${output.slice(-12_000)}`)
    expect(exit).toBe(0)
    expect(output).toMatch(/\b[1-9]\d* pass\b/)
    expect(output).toMatch(/\b0 fail\b/)
    console.info(
      `Persistence cases in a separate process: ${output.match(/\b\d+ pass\b/)?.[0]}, 0 fail`,
    )
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 70_000)

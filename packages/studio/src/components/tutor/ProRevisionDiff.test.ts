import { expect, test } from 'bun:test'
import path from 'node:path'

// Monaco mocks are owned by a child realm; other editor suites keep their real imports.
test.each([
  'success',
  'failure',
])('diff language lifecycle in an isolated realm: %s', async (mode) => {
  const child = Bun.spawn(
    [process.execPath, 'test', './src/components/tutor/fixtures/pro-revision-diff.cases.tsx'],
    {
      cwd: path.resolve(import.meta.dirname, '../../..'),
      windowsHide: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        NO_COLOR: '1',
        STUDIO_DIFF_IMPORT_FAILURE: mode === 'failure' ? '1' : '0',
      },
    },
  )
  const timer = setTimeout(() => child.kill(), 12000)
  async function drain(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader(),
      decoder = new TextDecoder()
    let tail = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return tail + decoder.decode()
        tail = (tail + decoder.decode(value, { stream: true })).slice(-20000)
      }
    } finally {
      reader.releaseLock()
    }
  }
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      drain(child.stdout),
      drain(child.stderr),
    ])
    const output = Bun.stripANSI(`${stdout}\n${stderr}`)
    expect(code, output).toBe(0)
    expect(output).toMatch(/\b[1-9]\d* pass\b/)
    expect(output).toMatch(/\b0 fail\b/)
    expect(output).toMatch(/\b[1-9]\d* expect\(\) calls\b/)
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 15000)

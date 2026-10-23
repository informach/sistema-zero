import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// Bun's inspector compatibility layer does not implement V8 Runtime.enable.
// Keep the actual Node/CDP contract outside Bun's test-file discovery.
test('native Node24 motion observation contracts, including under Bun CI', async () => {
  const child = Bun.spawn(
    [
      process.env.STUDIO_RUNTIME_TEST_NODE ?? process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
      '--test',
      '--test-reporter=tap',
      fileURLToPath(new URL('./motion-observation.cases.mjs', import.meta.url)),
    ],
    {
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    },
  )
  let expired = false
  const deadline = setTimeout(() => {
    expired = true
    child.kill()
  }, 20_000)
  async function outputTail(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let tail = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return (tail + decoder.decode()).slice(-64_000)
        tail = (tail + decoder.decode(value, { stream: true })).slice(-64_000)
      }
    } finally {
      reader.releaseLock()
    }
  }
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      outputTail(child.stdout),
      outputTail(child.stderr),
    ])
    const output = `${stdout}\n${stderr}`.replace(/\r\n/g, '\n')
    if (
      expired ||
      code !== 0 ||
      !/^# tests 10$/m.test(output) ||
      !/^# pass 10$/m.test(output) ||
      !/^# fail 0$/m.test(output) ||
      !/^# cancelled 0$/m.test(output) ||
      !/^# skipped 0$/m.test(output) ||
      !/^# todo 0$/m.test(output)
    )
      throw new Error(`Native motion: exit=${code}, expired=${expired}\n${output.slice(-12_000)}`)
    expect(code).toBe(0)
    console.info(
      'Native Node24 motion:10 passed,0 failed/cancelled/skipped/todo; Chromium qualification is separate',
    )
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}, 25_000)

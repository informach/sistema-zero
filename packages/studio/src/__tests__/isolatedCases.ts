import { resolve } from 'node:path'

/** Process startup and collection budget; original case deadlines remain inside the child. */
export const ISOLATED_STUDIO_CASE_TIMEOUT_MS = 70_000
const CHILD_DEADLINE_MS = 60_000
const OUTPUT_LIMIT = 64_000

async function readOutput(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let tail = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return (tail + decoder.decode()).slice(-OUTPUT_LIMIT)
      // Drain every byte so a verbose child cannot block on its pipe.
      tail = (tail + decoder.decode(value, { stream: true })).slice(-OUTPUT_LIMIT)
    }
  } finally {
    reader.releaseLock()
  }
}

/** Mock-producing fixtures own their module registry, never the main suite's storage bindings. */
export async function runIsolatedStudioCases(fixture: string): Promise<void> {
  const child = Bun.spawn([process.execPath, 'test', fixture], {
    cwd: resolve(import.meta.dirname, '../..'),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  const deadline = setTimeout(() => child.kill(), CHILD_DEADLINE_MS)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      readOutput(child.stdout),
      readOutput(child.stderr),
    ])
    const output = Bun.stripANSI(`${stdout}\n${stderr}`)
    if (exit !== 0 || !/\b[1-9]\d* pass\b/.test(output) || !/\b0 fail\b/.test(output))
      throw new Error(`Isolated cases ${fixture} exited ${exit}:\n${output.slice(-12_000)}`)
    console.info(
      `Isolated ${fixture}: ${output.match(/\b\d+ pass\b/)?.[0]}, 0 fail, ${output.match(/\b\d+ expect\(\) calls\b/)?.[0] ?? 'no expectation summary'}`,
    )
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}

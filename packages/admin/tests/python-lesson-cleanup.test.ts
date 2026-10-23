import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const helper = resolve(import.meta.dir, '../../community-kids/tests/e2e/python-lesson-cleanup.ts')

async function control(
  mode: 'body' | 'body-rejects' | 'close-rejects' | 'close-hangs' | 'body-hangs',
) {
  const out = await mkdtemp(join(tmpdir(), 'python-cleanup-'))
  const receiptPath = join(out, 'receipt.json')
  const script = `
    import { cleanupPythonLessonBrowser } from ${JSON.stringify(helper)};
    const mode = ${JSON.stringify(mode)};
    const receipt = { state: 'passed', failure: mode === 'body' ? null : 'primary failure', cleanup: [], events: [] };
    let release, interrupt, listenerFailure;
    const body = new Promise((resolve, reject) => { release = resolve; interrupt = reject; })
      .catch(error => { listenerFailure = error; });
    const pending = new Set([body]);
    let connected = true;
    await cleanupPythonLessonBrowser({
      receipt, receiptPath: ${JSON.stringify(receiptPath)}, pending, timeoutMs: 150,
      clearScenarioDeadline() { receipt.events.push('cleanup-guard-before-scenario-clear'); },
      detachResponses() { receipt.events.push('detached'); },
      context: { async close() {
        receipt.events.push('context-close');
        if (mode === 'close-hangs') await new Promise(() => {});
        if (mode === 'close-rejects') throw new Error('context close rejected');
        if (mode === 'body-rejects') { interrupt(new Error('body interrupted')); return; }
        if (mode !== 'body-hangs') release();
      } },
      browser: {
        async close() { receipt.events.push('browser-close'); connected = false; if (mode === 'close-rejects') release(); },
        isConnected() { return connected; }
      },
      validate() { receipt.events.push('validated'); if (listenerFailure) throw listenerFailure; }
    });
  `
  const child = Bun.spawn([process.execPath, '--eval', script], { stdout: 'pipe', stderr: 'pipe' })
  // Independent harness bound: a broken terminal timer cannot hang the unit runner.
  const watchdog = setTimeout(() => child.kill(), 3000)
  try {
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
    return { exitCode, stderr, receipt }
  } finally {
    clearTimeout(watchdog)
    await rm(out, { recursive: true, force: true })
  }
}

test('context close interrupts a pending body before draining response listeners', async () => {
  const { exitCode, stderr, receipt } = await control('body')
  expect(stderr).toBe('')
  expect(exitCode).toBe(0)
  expect(receipt.state).toBe('passed')
  expect(receipt.events).toEqual([
    'cleanup-guard-before-scenario-clear',
    'detached',
    'context-close',
    'browser-close',
    'validated',
  ])
  expect(receipt.cleanup).toEqual(['context-closed', 'browser-disconnected'])
})

test('failed context close still closes browser and preserves primary failure', async () => {
  const { exitCode, receipt } = await control('close-rejects')
  expect(exitCode).toBe(1)
  expect(receipt.failure).toBe('primary failure')
  expect(receipt.events).toContain('browser-close')
  expect(receipt.events).toContain('validated')
  expect(receipt.cleanup.join('\n')).toContain('context close rejected')
})

test('interrupted body listener failure is drained without replacing primary failure', async () => {
  const { exitCode, receipt } = await control('body-rejects')
  expect(exitCode).toBe(1)
  expect(receipt.failure).toBe('primary failure')
  expect(receipt.events).toContain('validated')
  expect(receipt.cleanup).toContain('browser-disconnected')
  expect(receipt.cleanup.join('\n')).toContain('body interrupted')
})

for (const mode of ['close-hangs', 'body-hangs'] as const)
  test(`terminal bound persists when ${mode}, recording primary error and unconfirmed resources`, async () => {
    const { exitCode, receipt } = await control(mode)
    expect(exitCode).toBe(1)
    expect(receipt.state).toBe('failed')
    expect(receipt.failure).toBe('primary failure')
    expect(receipt.events).toContain('context-close')
    expect(receipt.events).not.toContain('validated')
    expect(receipt.cleanup).toContain('cleanup-terminal-exit-resources-unconfirmed')
    expect(receipt.cleanup.join('\n')).toContain('Cleanup terminal deadline exceeded')
    if (mode === 'body-hangs') expect(receipt.cleanup).toContain('browser-disconnected')
  })

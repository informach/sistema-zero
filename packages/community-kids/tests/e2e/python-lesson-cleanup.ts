import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

type Receipt = { state: string; failure: string | null; cleanup: string[] }

export function failPythonLessonCleanup(receipt: Receipt, error: unknown) {
  receipt.state = 'failed'
  receipt.failure ??= String(error).slice(0, 3000)
  receipt.cleanup.push(`cleanup-failed: ${String(error).slice(0, 400)}`)
  process.exitCode = 1
}

// This is also used by inert controls: no Playwright import or browser launch here.
export async function cleanupPythonLessonBrowser(options: {
  receipt: Receipt
  receiptPath: string
  context?: { close(): Promise<void> }
  browser?: { close(): Promise<void>; isConnected(): boolean }
  pending: ReadonlySet<Promise<void>>
  detachResponses(): void
  clearScenarioDeadline(): void
  validate(): void
  timeoutMs?: number
}) {
  const { receipt, receiptPath } = options
  const fail = (error: unknown) => failPythonLessonCleanup(receipt, error)
  const serialize = () => `${JSON.stringify(receipt, null, 2)}\n`
  // Keep a terminal bound through close, listener drain, validation and receipt I/O.
  // The owned external controller must still reconcile descendants after a terminal exit.
  const terminal = setTimeout(() => {
    fail(new Error('Cleanup terminal deadline exceeded'))
    receipt.cleanup.push('cleanup-terminal-exit-resources-unconfirmed')
    try {
      writeFileSync(receiptPath, serialize())
    } finally {
      process.exit(1)
    }
  }, options.timeoutMs ?? 30_000)
  try {
    try {
      options.clearScenarioDeadline()
      options.detachResponses()
    } catch (error) {
      fail(error)
    }
    // Closing interrupts bodies awaited by response.json(). Never drain them first.
    if (options.context)
      await options.context
        .close()
        .then(() => receipt.cleanup.push('context-closed'))
        .catch(fail)
    if (options.browser)
      await options.browser
        .close()
        .then(() => {
          assert.equal(options.browser?.isConnected(), false)
          receipt.cleanup.push('browser-disconnected')
        })
        .catch(fail)
    for (const result of await Promise.allSettled([...options.pending]))
      if (result.status === 'rejected') fail(result.reason)
    try {
      options.validate()
    } catch (error) {
      fail(error)
    }
    await writeFile(receiptPath, serialize())
  } finally {
    clearTimeout(terminal)
  }
}

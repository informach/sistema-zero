import { writeFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'

/** Opt-in browser diagnosis. No product policy, timing or runtime changes. */
export async function tracePythonFrameLayout(page: Page, info: TestInfo, options?: { cpu: true }) {
  const cpu = options?.cpu === true
  if ((cpu ? process.env.PYTHON_LIVE_PROFILE : process.env.PYTHON_LAYOUT_TRACE) !== '1')
    return async () => {}
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Tracing.start', {
      categories: cpu
        ? 'blink,devtools.timeline,blink.user_timing,v8,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.cpu_profiler.hires'
        : 'blink,devtools.timeline,blink.user_timing',
      transferMode: 'ReturnAsStream',
    })
  } catch (error) {
    try {
      await session.detach()
    } catch (cleanupError) {
      await info
        .attach('trace-setup-cleanup-error', {
          body: String(cleanupError),
          contentType: 'text/plain',
        })
        .catch(() => undefined)
    }
    throw error
  }
  return async () => {
    try {
      const completed = new Promise<string>((resolve) => {
        session.once('Tracing.tracingComplete', (event) => resolve(event.stream!))
      })
      await session.send('Tracing.end')
      const stream = await completed
      const chunks: Buffer[] = []
      let size = 0
      try {
        for (;;) {
          const result = await session.send('IO.read', { handle: stream, size: 64 * 1024 })
          const bytes = Buffer.from(result.data, result.base64Encoded ? 'base64' : 'utf8')
          size += bytes.length
          if (size > 32 * 1024 * 1024)
            throw new Error('Layout trace exceeded the diagnostic budget')
          chunks.push(bytes)
          if (result.eof) break
        }
        const output = info.outputPath(
          cpu ? 'python-execution-cpu.json' : 'python-layout-timeline.json',
        )
        await writeFile(output, Buffer.concat(chunks))
        if (cpu)
          await info.attach('execution-cpu-trace', {
            path: output,
            contentType: 'application/json',
          })
      } finally {
        await session.send('IO.close', { handle: stream })
      }
    } finally {
      await session.detach()
    }
  }
}

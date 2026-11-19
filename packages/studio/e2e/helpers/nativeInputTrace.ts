import type { Browser, CDPSession, Page, TestInfo } from '@playwright/test'

interface CompletedTrace {
  stream?: string
  dataLossOccurred?: boolean
}
const traces = new WeakMap<Browser, { session: CDPSession; completed: Promise<CompletedTrace> }>()

/** Optional Chromium-native input evidence, without listeners in the page. */
export async function startNativeInputTrace(page: Page): Promise<void> {
  if (process.env.STUDIO_NATIVE_INPUT_TRACE !== '1') return
  const browser = page.context().browser()
  if (!browser || browser.browserType().name() !== 'chromium' || traces.has(browser)) return
  const session = await browser.newBrowserCDPSession()
  const completed = new Promise<CompletedTrace>((resolve) =>
    session.once('Tracing.tracingComplete', resolve),
  )
  await session.send('Tracing.start', {
    traceConfig: {
      recordMode: 'recordContinuously',
      includedCategories: [
        'input',
        'latencyInfo',
        'disabled-by-default-input',
        'disabled-by-default-latencyInfo',
      ],
    },
    transferMode: 'ReturnAsStream',
    streamFormat: 'json',
    streamCompression: 'none',
  })
  traces.set(browser, { session, completed })
}

export async function stopNativeInputTrace(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus) return
  const browser = page.context().browser()
  if (browser) await finishNativeInputTrace(browser, info, true)
}

export async function disposeNativeInputTrace(browser: Browser, info: TestInfo): Promise<void> {
  await finishNativeInputTrace(browser, info, false)
}

async function finishNativeInputTrace(
  browser: Browser,
  info: TestInfo,
  attach: boolean,
): Promise<void> {
  const trace = traces.get(browser)
  if (!trace) return
  traces.delete(browser)
  let handle: string | undefined
  try {
    await trace.session.send('Tracing.end')
    const result = await trace.completed
    handle = result.stream
    if (!handle) throw new Error('Chromium did not return its native input trace')
    if (!attach) return
    const chunks: Buffer[] = []
    let bytes = 0
    let truncated = false
    for (;;) {
      const chunk = await trace.session.send('IO.read', { handle, size: 65_536 })
      const buffer = Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8')
      if (bytes + buffer.byteLength > 8 * 1024 * 1024) {
        truncated = true
        break
      }
      chunks.push(buffer)
      bytes += buffer.byteLength
      if (chunk.eof) break
    }
    await info.attach('native-input-trace.json', {
      body: Buffer.concat(chunks),
      contentType: 'application/json',
    })
    await info.attach('native-input-receipt.json', {
      body: JSON.stringify({
        bytes,
        truncated,
        dataLossOccurred: result.dataLossOccurred ?? false,
        browserScope: true,
        domObservation: process.env.STUDIO_MENU_CAPTURE !== '0',
      }),
      contentType: 'application/json',
    })
  } finally {
    if (handle) await trace.session.send('IO.close', { handle })
    await trace.session.detach()
  }
}

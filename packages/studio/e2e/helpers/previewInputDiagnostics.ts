import { writeFile } from 'node:fs/promises'
import { type Page, test } from '@playwright/test'

/** Opt-in observations only: never dispatches an input or changes game execution. */
export function configurePreviewInputDiagnostics(): void {
  const navigation = new WeakMap<Page, Array<{ time: number; url: string }>>()
  test.beforeEach(async ({ page }) => {
    if (process.env.STUDIO_INPUT_DIAGNOSTICS !== '1') return
    const frames: Array<{ time: number; url: string }> = []
    navigation.set(page, frames)
    page.on('framenavigated', (frame) => {
      if (frames.length < 200) frames.push({ time: Date.now(), url: frame.url().slice(0, 160) })
    })
    await page.addInitScript(() => {
      const channel = 'sz-e2e-preview-input'
      const records: object[] = []
      const retain = (value: object) => {
        records.push(value)
        if (records.length > 200) records.shift()
      }
      if (window === window.top) {
        Reflect.set(window, channel, records)
        window.addEventListener('message', (event) => {
          const data = event.data
          if (data?.source !== channel || typeof data.type !== 'string') return
          retain({
            type: data.type.slice(0, 40),
            time: typeof data.time === 'number' ? data.time : null,
            url: typeof data.url === 'string' ? data.url.slice(0, 160) : '',
            active: typeof data.active === 'string' ? data.active.slice(0, 40) : '',
            key: typeof data.key === 'string' ? data.key.slice(0, 40) : '',
            ctrl: data.ctrl === true,
            alt: data.alt === true,
            meta: data.meta === true,
            shift: data.shift === true,
          })
        })
      }
      const report = (event: Event) => {
        const key = event instanceof KeyboardEvent ? event : null
        const value = {
          source: channel,
          type: event.type,
          time: Date.now(),
          url: location.href.slice(0, 160),
          active: document.activeElement?.tagName ?? '',
          key: key?.key ?? '',
          ctrl: key?.ctrlKey ?? false,
          alt: key?.altKey ?? false,
          meta: key?.metaKey ?? false,
          shift: key?.shiftKey ?? false,
        }
        if (window === window.top) retain(value)
        else window.top?.postMessage(value, '*')
      }
      for (const type of ['keydown', 'keyup', 'focusin', 'focusout', 'readystatechange'])
        document.addEventListener(type, report, { capture: true, passive: true })
      window.addEventListener('focus', report, { passive: true })
      window.addEventListener('blur', report, { passive: true })
    })
  })
  test.afterEach(async ({ page }, info) => {
    if (process.env.STUDIO_INPUT_DIAGNOSTICS !== '1') return
    let timer: ReturnType<typeof setTimeout> | undefined
    let events: unknown
    try {
      events = await Promise.race([
        page.evaluate(() => Reflect.get(window, 'sz-e2e-preview-input')),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Main page did not answer diagnostic capture')),
            2000,
          )
        }),
      ])
    } catch (error) {
      events = { captureError: error instanceof Error ? error.message : String(error) }
    } finally {
      clearTimeout(timer)
    }
    const path = info.outputPath('preview-input.json')
    await writeFile(
      path,
      JSON.stringify(
        {
          status: info.status,
          navigation: navigation.get(page),
          events,
        },
        null,
        2,
      ),
    )
    await info.attach('preview-input', { path, contentType: 'application/json' })
  })
}

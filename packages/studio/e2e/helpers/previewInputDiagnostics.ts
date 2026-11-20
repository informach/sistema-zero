import { writeFile } from 'node:fs/promises'
import { type CDPSession, type Page, test } from '@playwright/test'

interface InputProbe {
  key: string
  started: number
  observed: number
  frames: Array<{ url: string; state?: unknown; error?: string; targetError?: string | null }>
}
const pendingInput = new WeakMap<Page, InputProbe[]>()
export function pendingPreviewInputs(page: Page): readonly InputProbe[] {
  return pendingInput.get(page) ?? []
}
interface InputTarget {
  url: string
  session: CDPSession | null
  error: string | null
}
const targets = new WeakMap<Page, Promise<InputTarget[]>>()

function inputTargets(page: Page): Promise<InputTarget[]> {
  const current = targets.get(page)
  if (current) return current
  const prepared = Promise.all(
    [page, ...page.frames().filter((frame) => frame.parentFrame())].map(async (target) => {
      const url = target.url().slice(0, 160)
      try {
        const session = await page.context().newCDPSession(target)
        return { url, session, error: null }
      } catch (error) {
        return { url, session: null, error: error instanceof Error ? error.message : String(error) }
      }
    }),
  )
  targets.set(page, prepared)
  return prepared
}

/** The original native action; a slow-call probe only reads document state. */
export async function pressObservedPreviewKey(page: Page, key: string): Promise<void> {
  if (process.env.STUDIO_INPUT_DIAGNOSTICS !== '1') return page.keyboard.press(key)
  const sessions = await inputTargets(page)
  const started = Date.now()
  let probe: Promise<void> | undefined
  const timer = setTimeout(() => {
    probe = Promise.all(
      sessions.map(async ({ url, session, error }) => {
        if (!session) return { url, targetError: error }
        let deadline: ReturnType<typeof setTimeout> | undefined
        try {
          // Frame.evaluate participates in DOM snapshot instrumentation and can
          // wait for a different, blocked frame. Read through the public CDP
          // session instead; no pause/resume or execution-changing commands.
          const response = await Promise.race([
            session.send('Runtime.evaluate', {
              expression: `({ready:document.readyState,active:document.activeElement?.tagName,
                bodyChildren:document.body?.children.length,scripts:document.scripts.length,
                isolated:globalThis.crossOriginIsolated,events:Reflect.get(window,'sz-e2e-preview-input')})`,
              returnByValue: true,
            }),
            new Promise<never>((_, reject) => {
              deadline = setTimeout(() => reject(new Error('Document did not answer')), 2000)
            }),
          ])
          return response.exceptionDetails
            ? { url, error: response.exceptionDetails.text }
            : { url, state: response.result.value }
        } catch (error) {
          return { url, error: error instanceof Error ? error.message : String(error) }
        } finally {
          clearTimeout(deadline)
        }
      }),
    ).then((frames) => {
      pendingInput.get(page)?.push({ key, started, observed: Date.now(), frames })
    })
  }, 5000)
  try {
    await page.keyboard.press(key)
  } finally {
    clearTimeout(timer)
    await probe
  }
}

/** Opt-in observations only: never dispatches an input or changes game execution. */
export function configurePreviewInputDiagnostics(): void {
  const navigation = new WeakMap<Page, Array<{ time: number; url: string }>>()
  test.beforeEach(async ({ page }) => {
    if (process.env.STUDIO_INPUT_DIAGNOSTICS !== '1') return
    const frames: Array<{ time: number; url: string }> = []
    navigation.set(page, frames)
    pendingInput.set(page, [])
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
        // A native key may remain pending across a navigation even when both
        // renderers answer. Keep a bounded diff of the actual fixture documents
        // to distinguish source regeneration from runtime/resource changes.
        const documents = new WeakMap<HTMLIFrameElement, string>()
        const difference = (previous: string, next: string) => {
          let start = 0
          while (start < previous.length && start < next.length && previous[start] === next[start])
            start++
          let end = 0
          while (
            end < previous.length - start &&
            end < next.length - start &&
            previous[previous.length - end - 1] === next[next.length - end - 1]
          )
            end++
          return {
            start,
            removed: previous.slice(start, previous.length - end).slice(0, 1024),
            inserted: next.slice(start, next.length - end).slice(0, 1024),
          }
        }
        // Diagnostic strings only: never replace the actual document or its CSP.
        // A changed CSP hash otherwise hides the actual program change later on.
        const readableSource = (source: string) =>
          source
            .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '')
            .replace(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/g, (_, encoded: string) =>
              new TextDecoder().decode(
                Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)),
              ),
            )
        const observeDocument = (frame: HTMLIFrameElement) => {
          if (frame.title !== 'Pré-visualização') return
          const next = frame.srcdoc
          const previous = documents.get(frame) ?? ''
          if (next === previous) return
          documents.set(frame, next)
          retain({
            type: 'preview-document',
            time: Date.now(),
            previousBytes: previous.length,
            bytes: next.length,
            ...difference(previous, next),
            sourceChange:
              previous.length > 54 && next.length > 54
                ? difference(readableSource(previous), readableSource(next))
                : null,
          })
        }
        new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.target instanceof HTMLIFrameElement)
              observeDocument(mutation.target)
            for (const node of mutation.addedNodes) {
              if (!(node instanceof Element)) continue
              if (node instanceof HTMLIFrameElement) observeDocument(node)
              for (const frame of node.querySelectorAll('iframe')) observeDocument(frame)
            }
          }
        }).observe(document, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['srcdoc'],
        })
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
            () => reject(new Error('Playwright diagnostic capture did not complete')),
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
          pendingInput: pendingPreviewInputs(page),
          events,
        },
        null,
        2,
      ),
    )
    await info.attach('preview-input', { path, contentType: 'application/json' })
  })
}

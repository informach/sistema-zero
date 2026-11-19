import type { Page, TestInfo } from '@playwright/test'

declare global {
  interface Window {
    studioMenuInteractions?: unknown[]
  }
}

/** Test-only evidence; no layout reads, focus changes, or per-event browser/Node RPC. */
export async function recordMenuInteractions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const entries: unknown[] = []
    window.studioMenuInteractions = entries
    const push = (value: unknown) => {
      entries.push(value)
      if (entries.length > 100) entries.shift()
    }
    const child = window.parent !== window
    const knownFrames = new WeakSet<object>()
    if (!child) {
      window.addEventListener('message', (event) => {
        const data: unknown = event.data
        const source = event.source
        if (
          !data ||
          typeof data !== 'object' ||
          !('source' in data) ||
          data.source !== 'studio-test-menu-observation' ||
          !('entries' in data) ||
          !Array.isArray(data.entries) ||
          !source ||
          !(
            knownFrames.has(source) ||
            Array.from(document.querySelectorAll('iframe')).some(
              (frame) => frame.contentWindow === source,
            )
          )
        )
          return
        knownFrames.add(source)
        for (const value of data.entries.slice(-100)) push({ frame: 'preview', value })
      })
    }
    const nodes = new WeakMap<Element, number>()
    let nextNode = 0
    const describe = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null
      let identity = nodes.get(target)
      if (identity === undefined) {
        identity = ++nextNode
        nodes.set(target, identity)
      }
      return {
        node: identity,
        tag: target.tagName,
        id: target.id,
        role: target.getAttribute('role'),
        label: target.getAttribute('aria-label'),
        classes: target.getAttribute('class')?.slice(0, 160),
      }
    }
    const record = (value: unknown, flush: boolean) => {
      if (child) {
        entries.push(value)
        if (entries.length > 100) entries.shift()
        if (flush) {
          // Only this fixture's parent receives primitive diagnostic values. The
          // product's authenticated message handler does not consume this source.
          window.parent.postMessage(
            { source: 'studio-test-menu-observation', entries: entries.splice(0) },
            '*',
          )
        }
      } else push({ frame: 'editor', value })
    }
    for (const type of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'gotpointercapture',
      'lostpointercapture',
      'click',
      'contextmenu',
      'focusin',
      'focus',
      'blur',
      'load',
      'pagehide',
    ]) {
      window.addEventListener(
        type,
        (event) => {
          if (type === 'load' && !(event.target instanceof HTMLIFrameElement)) return
          if (!child && event.target instanceof HTMLIFrameElement && event.target.contentWindow)
            knownFrames.add(event.target.contentWindow)
          const pointer =
            event instanceof MouseEvent
              ? { x: event.clientX, y: event.clientY, button: event.button, buttons: event.buttons }
              : null
          const value = {
            timeOrigin: performance.timeOrigin,
            time: performance.now(),
            type,
            trusted: event.isTrusted,
            defaultPrevented: event.defaultPrevented,
            documentHasFocus: document.hasFocus(),
            pointerId: event instanceof PointerEvent ? event.pointerId : null,
            pointerType: event instanceof PointerEvent ? event.pointerType : null,
            window: event.target === window,
            target: describe(event.target),
            active: describe(document.activeElement),
            pointer,
            menu: describe(document.querySelector('[role="menu"]')),
          }
          record(value, type !== 'load')
          if (type === 'contextmenu')
            setTimeout(
              () =>
                record(
                  {
                    ...value,
                    type: 'contextmenu-after-dispatch',
                    defaultPrevented: event.defaultPrevented,
                  },
                  true,
                ),
              0,
            )
        },
        { capture: true, passive: true },
      )
    }
  })
}

export async function attachMenuInteractions(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus || page.isClosed()) return
  const entries = await page.evaluate(() => window.studioMenuInteractions ?? [])
  await info.attach('menu-interactions.json', {
    body: JSON.stringify(entries, null, 2),
    contentType: 'application/json',
  })
}

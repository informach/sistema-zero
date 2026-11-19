import type { Page, TestInfo } from '@playwright/test'

declare global {
  interface Window {
    studioRecordMenuInteraction?: (value: unknown) => Promise<void>
  }
}

const recordings = new WeakMap<Page, unknown[]>()

/** Test-only evidence across frames, without layout reads or changes to focus/events. */
export async function recordMenuInteractions(page: Page): Promise<void> {
  const entries: unknown[] = []
  recordings.set(page, entries)
  await page.exposeBinding('studioRecordMenuInteraction', (source, value) => {
    entries.push({ frame: source.frame.parentFrame() ? 'preview' : 'editor', value })
    if (entries.length > 100) entries.shift()
  })
  await page.addInitScript(() => {
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
    for (const type of [
      'pointerdown',
      'pointerup',
      'click',
      'contextmenu',
      'focusin',
      'focus',
      'blur',
      'load',
    ]) {
      window.addEventListener(
        type,
        (event) => {
          if (type === 'load' && !(event.target instanceof HTMLIFrameElement)) return
          const pointer =
            event instanceof MouseEvent
              ? {
                  x: event.clientX,
                  y: event.clientY,
                  button: event.button,
                  buttons: event.buttons,
                }
              : null
          const menu = document.querySelector('[role="menu"]')
          const value = {
            timeOrigin: performance.timeOrigin,
            time: performance.now(),
            type,
            trusted: event.isTrusted,
            window: event.target === window,
            target: describe(event.target),
            active: describe(document.activeElement),
            pointer,
            menu: describe(menu),
          }
          void window.studioRecordMenuInteraction?.(value).catch(() => {
            // Navigation may destroy the diagnostic binding; never affect the game.
          })
        },
        { capture: true, passive: true },
      )
    }
  })
}

export async function attachMenuInteractions(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus || page.isClosed()) return
  await info.attach('menu-interactions.json', {
    body: JSON.stringify(recordings.get(page) ?? [], null, 2),
    contentType: 'application/json',
  })
}

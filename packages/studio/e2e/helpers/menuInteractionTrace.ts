import type { Page, TestInfo } from '@playwright/test'

declare global {
  interface Window {
    studioMenuInteractionTrace?: unknown[]
  }
}

/** Test-only, bounded event evidence; never changes focus, timing or event delivery. */
export async function recordMenuInteractions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (window.top !== window) return
    const entries: unknown[] = []
    window.studioMenuInteractionTrace = entries
    const describe = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null
      return {
        tag: target.tagName,
        id: target.id,
        role: target.getAttribute('role'),
        label: target.getAttribute('aria-label'),
        classes: target.getAttribute('class')?.slice(0, 160),
      }
    }
    for (const type of ['pointerdown', 'pointerup', 'click', 'focusin', 'load']) {
      document.addEventListener(
        type,
        (event) => {
          if (type === 'load' && !(event.target instanceof HTMLIFrameElement)) return
          const pointer =
            event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : null
          const menu = document.querySelector('[role="menu"]')
          entries.push({
            time: performance.now(),
            type,
            target: describe(event.target),
            active: describe(document.activeElement),
            pointer,
            hit: pointer ? describe(document.elementFromPoint(pointer.x, pointer.y)) : null,
            menu: menu
              ? { node: describe(menu), bounds: menu.getBoundingClientRect().toJSON() }
              : null,
          })
          if (entries.length > 100) entries.shift()
        },
        { capture: true, passive: true },
      )
    }
  })
}

export async function attachMenuInteractions(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus || page.isClosed()) return
  const entries = await page.evaluate(() => window.studioMenuInteractionTrace ?? [])
  await info.attach('menu-interactions.json', {
    body: JSON.stringify(entries, null, 2),
    contentType: 'application/json',
  })
}

import { expect, type Page, test } from '@playwright/test'

/** A successful game run must not hide host/renderer errors from the browser. */
export function requireCleanRuntimeBrowser() {
  const errors = new WeakMap<Page, string[]>()
  test.beforeEach(async ({ page }) => {
    const current: string[] = []
    errors.set(page, current)
    // A probe icon is unrelated to the learner's files.
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }))
    page.on('console', (message) => {
      if (message.type() === 'error') current.push(message.text())
    })
    page.on('pageerror', (error) => current.push(error.message))
  })
  test.afterEach(async ({ page }, info) => {
    const current = errors.get(page) ?? []
    await info.attach('browser-errors', {
      body: JSON.stringify(current),
      contentType: 'application/json',
    })
    expect(current).toEqual([])
  })
}

/** Returning focus later cannot erase a transition to a hidden execution. */
export function requireRetainedHostFocus(frameTitle: string) {
  const taken = new WeakMap<Page, boolean>()
  const marker = `__sz_hidden_student_test_took_focus__:${frameTitle}`
  test.beforeEach(async ({ page }) => {
    taken.set(page, false)
    page.on('console', (message) => {
      if (message.text() === marker) taken.set(page, true)
    })
    await page.addInitScript(
      ({ title, marker }) => {
        let reported = false
        const inspect = () => {
          const active = document.activeElement
          if (!reported && active instanceof HTMLIFrameElement && active.title === title) {
            reported = true
            console.info(marker)
          }
        }
        document.addEventListener('focusin', inspect, true)
        window.addEventListener('blur', () => queueMicrotask(inspect))
        window.setInterval(inspect, 10)
      },
      { title: frameTitle, marker },
    )
  })
  test.afterEach(async ({ page }, info) => {
    await info.attach('hidden-frame-focus', {
      body: JSON.stringify({ frameTitle, taken: taken.get(page) }),
      contentType: 'application/json',
    })
    expect(taken.get(page)).toBe(false)
  })
}

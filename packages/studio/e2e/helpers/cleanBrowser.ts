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

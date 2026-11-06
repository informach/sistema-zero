import assert from 'node:assert/strict'
import type { Page } from 'playwright'

/** Real browser checks for the shared image dialog, including the old corner-position bug. */
export async function checkOfferImageZoom(page: Page) {
  const dialog = page.locator('[data-offer-image-dialog]')
  for (const link of await page.locator('a[data-offer-zoom]').all()) {
    await link.focus()
    await link.press('Enter')
    await dialog.waitFor({ state: 'visible' })
    await dialog.locator('img').evaluate((image) => (image as HTMLImageElement).decode())
    assert.equal(
      await dialog.locator('img').getAttribute('alt'),
      await link.locator('img').getAttribute('alt'),
    )
    const bounds = await dialog.boundingBox()
    const viewport = page.viewportSize()
    assert(bounds && viewport)
    assert(
      Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2) < 2,
      'image centered horizontally',
    )
    assert(
      Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2) < 2,
      'image centered vertically',
    )
    assert(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height,
      'image fits the screen',
    )
    await page.keyboard.press('Tab')
    assert(await dialog.evaluate((element) => element.contains(document.activeElement)))
    await page.keyboard.press('Shift+Tab')
    assert(await dialog.evaluate((element) => element.contains(document.activeElement)))
    await page.keyboard.press('Escape')
    assert(!(await dialog.isVisible()))
    assert(await link.evaluate((element) => document.activeElement === element), 'focus restored')
  }
  const link = page.locator('a[data-offer-zoom]').first()
  await link.click()
  await dialog.getByRole('button', { name: 'Fechar imagem ampliada' }).click()
  assert(!(await dialog.isVisible()))

  // Native `close` events are queued. Reopening before that event must not let
  // the previous dialog lifecycle clear the new image or restore stale focus.
  const previousOverflow = await page.evaluate(() => document.documentElement.style.overflow)
  const second = page.locator('a[data-offer-zoom]').nth(1)
  await link.click()
  await page.evaluate(async () => {
    const current = document.querySelector<HTMLDialogElement>('[data-offer-image-dialog]')!
    const next = document.querySelectorAll<HTMLAnchorElement>('a[data-offer-zoom]')[1]!
    current.querySelector<HTMLButtonElement>('button')!.click()
    next.focus()
    next.click()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })
  assert(await dialog.isVisible(), 'rapidly reopened image remains visible')
  assert.equal(
    await dialog.locator('img').getAttribute('alt'),
    await second.locator('img').getAttribute('alt'),
  )
  await dialog.locator('img').evaluate((image) => (image as HTMLImageElement).decode())
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden')
  assert(
    await dialog.evaluate((element) => element.contains(document.activeElement)),
    'focus stays in the reopened dialog',
  )
  await page.keyboard.press('Escape')
  assert(!(await dialog.isVisible()))
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), previousOverflow)
  assert(
    await second.evaluate((element) => document.activeElement === element),
    'focus returns to the latest opener',
  )
}

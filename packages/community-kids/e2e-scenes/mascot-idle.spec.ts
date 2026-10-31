import { expect, test } from '@playwright/test'
import { animationPixels } from './animation-pixels'

test('a pose inteira permanece estável em repouso e só anima durante a fala', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/mascot-idle')
  const drawing = page.locator('[data-mascot] svg')
  await expect(drawing).toBeVisible()
  for (const width of [1280, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(drawing).toHaveCSS('width', width < 640 ? '64px' : '96px')
    const frame = await animationPixels(drawing)
    expect(frame.count).toBeGreaterThan(500)
    expect(frame.left).toBeGreaterThan(0.02)
    expect(frame.right).toBeLessThan(0.98)
    expect(Math.abs(frame.center - 0.5)).toBeLessThan(0.15)
  }
  const idle = await animationPixels(drawing)
  for (let i = 0; i < 4; i++) expect((await animationPixels(drawing)).hash).toBe(idle.hash)
  await page.getByRole('button', { name: 'Ouvir' }).click()
  await expect.poll(async () => (await animationPixels(drawing)).hash).not.toBe(idle.hash)
  await page.getByRole('button', { name: 'Parar' }).click()
  await expect.poll(async () => (await animationPixels(drawing)).hash).toBe(idle.hash)
  expect(errors).toEqual([])
})

test('mantém a reserva enquanto carrega e quando a rede falha', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/speaking.*.edi-animation.json', async (route) => {
    await pending
    await route.abort()
  })
  const request = page.waitForRequest('**/speaking.*.edi-animation.json')
  try {
    await page.goto('/mascot-idle')
    await request
    const image = page.locator('[data-mascot] img')
    await expect(image).toBeVisible()
    release()
    await expect(image).toBeVisible()
    expect(await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
      true,
    )
  } finally {
    release()
  }
})

test('movimento reduzido mostra a reserva sem carregar o motor da fala', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/mascot-idle')
  await expect(page.locator('[data-mascot] img')).toBeVisible()
  await expect(page.locator('[data-mascot] svg')).toHaveCount(0)
  expect(
    requested.some((url) => url.includes('speaking.') && url.endsWith('.edi-animation.json')),
  ).toBe(false)
})

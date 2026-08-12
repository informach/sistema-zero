import { expect, type FrameLocator, type Page, test } from '@playwright/test'

declare global {
  interface Window {
    SZGame2D?: {
      actionDown(action: string): boolean
    }
  }
}

test.use({
  hasTouch: true,
  viewport: { width: 370, height: 844 },
})

function reinoZeroCard(page: Page) {
  return page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero', { exact: true }) })
    .first()
}

async function openReinoZero(page: Page): Promise<FrameLocator> {
  await page.goto('/')
  const card = reinoZeroCard(page)
  if (!(await card.isVisible())) {
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  }
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })

  const iframe = page.locator('iframe[title="Pré-visualização"]')
  await expect(iframe).toHaveAttribute('srcdoc', /SZGame2D/, { timeout: 20_000 })
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 20_000 })
  return preview
}

test('Reino Zero básico ensina a tecla de seleção de jogadores', async ({ page }) => {
  await page.goto('/')
  const card = reinoZeroCard(page)
  if (!(await card.isVisible())) {
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  }
  await expect(card).toContainText('Backspace')
})

test('Reino Zero básico mantém todos os controles touch dentro do viewport', async ({ page }) => {
  const preview = await openReinoZero(page)
  const controls = preview.locator('[data-sz-g2d-classic-controls]')
  await expect(controls).toBeVisible()
  await expect(controls.locator('button')).toHaveCount(9)

  const layout = await controls.evaluate((root) => ({
    viewportWidth: window.innerWidth,
    buttons: Array.from(root.querySelectorAll('button'), (button) => {
      const rect = button.getBoundingClientRect()
      return { action: button.dataset.szG2dAction, left: rect.left, right: rect.right }
    }),
  }))
  expect(layout.buttons, JSON.stringify(layout)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ action: 'select' }),
      expect.objectContaining({ action: 'jump' }),
    ]),
  )
  for (const button of layout.buttons) {
    expect(button.left, button.action).toBeGreaterThanOrEqual(0)
    expect(button.right, button.action).toBeLessThanOrEqual(layout.viewportWidth)
  }

  const select = controls.locator('[data-sz-g2d-action="select"]')
  await select.dispatchEvent('pointerdown', {
    bubbles: true,
    pointerId: 17,
    pointerType: 'touch',
  })
  await expect
    .poll(() =>
      preview.locator('body').evaluate(() => window.SZGame2D?.actionDown('select') ?? false),
    )
    .toBe(true)
  await select.dispatchEvent('pointerup', {
    bubbles: true,
    pointerId: 17,
    pointerType: 'touch',
  })
})

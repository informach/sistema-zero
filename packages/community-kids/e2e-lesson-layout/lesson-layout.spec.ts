import { expect, test } from '@playwright/test'

test('orientation and real Studio stack with spacing and retain their editor across widths', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const tool = page.locator('[data-panel-id="lesson-tool"]')
  const content = page.locator('[data-panel-id="lesson-content"]')
  await expect(tool.locator('.sz-lesson-objectives-action')).toBeVisible()
  await expect(tool.locator('.blocklySvg').first()).toBeVisible({ timeout: 30_000 })
  // Blockly may rebuild its SVG when its own internal panes switch to tabs.
  // The lesson's Studio container and edited project must survive that resize.
  await tool
    .getByRole('heading', { name: 'Seu projeto no Estúdio' })
    .locator('../..')
    .evaluate((element) => element.setAttribute('data-layout-witness', 'same-editor'))
  await tool.getByRole('button', { name: 'Meu projeto', exact: true }).click()
  await tool
    .getByRole('textbox', { name: 'Nome do projeto', exact: true })
    .fill('Meu rascunho preservado')
  await tool.getByRole('textbox', { name: 'Nome do projeto', exact: true }).press('Tab')
  await expect(tool.getByRole('textbox', { name: 'Nome do projeto', exact: true })).toHaveCount(0)
  await expect(
    tool.getByRole('button', { name: 'Meu rascunho preservado', exact: true }),
  ).toBeVisible()
  for (const width of [1440, 958, 768, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('button', { name: 'Ver exemplo', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toHaveCount(0)
    await expect(
      page.getByText('Agora faça o personagem aparecer ao tocar no esconderijo.', { exact: true }),
    ).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Ouvir/ })).toHaveCount(1)
    await expect(tool.locator('[data-layout-witness="same-editor"]')).toHaveCount(1)
    await expect(
      tool.getByRole('button', { name: 'Meu rascunho preservado', exact: true }),
    ).toBeVisible()
    await expect
      .poll(async () => {
        const left = await content.boundingBox(),
          right = await tool.boundingBox()
        if (!left || !right) return false
        return width >= 1440
          ? right.x >= left.x + left.width
          : right.y - (left.y + left.height) >= 23
      })
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 958 || width === 390) {
      await page.screenshot({ path: testInfo.outputPath(`stack-${width}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})

test('compact objectives preserve creation height and expanded overflow remains scrollable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const tool = page.locator('[data-panel-id="lesson-tool"]')
  const objectives = tool.locator('.sz-lesson-objectives')
  const toggle = objectives.locator('button[aria-expanded]')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect((await objectives.boundingBox())!.height).toBeLessThan(110)
  const viewport = tool.locator('.isolate.overflow-hidden').first()
  const normalHeight = (await viewport.boundingBox())!.height
  expect(normalHeight).toBeGreaterThanOrEqual(576)
  await toggle.click()
  await expect(objectives.getByText('Revele o personagem tocado.', { exact: true })).toBeVisible()
  expect((await viewport.boundingBox())!.height).toBe(normalHeight)
  await toggle.click()
  await page.getByRole('button', { name: 'Expandir', exact: true }).click()
  const expandedHeight = (await viewport.boundingBox())!.height
  await page.screenshot({ path: testInfo.outputPath('expanded-compact.png') })
  await toggle.click()
  expect((await viewport.boundingBox())!.height).toBeGreaterThanOrEqual(Math.min(384, 450))
  await toggle.click()
  expect((await viewport.boundingBox())!.height).toBeGreaterThanOrEqual(expandedHeight - 1)
  await page.setViewportSize({ width: 844, height: 390 })
  await toggle.click()
  const frame = tool.locator('.fixed.inset-0')
  expect(await frame.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto')
  expect((await viewport.boundingBox())!.height).toBeGreaterThanOrEqual(195)
  await objectives.locator('.sz-lesson-objectives-action').scrollIntoViewIfNeeded()
  await expect(objectives.locator('.sz-lesson-objectives-action')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('expanded-low-window.png') })
  await page.getByRole('button', { name: 'Reduzir', exact: true }).click()
})

test('the same stacked spacing applies to a real scene activity', async ({ page }) => {
  await page.goto('/?kind=scene')
  const tool = page.locator('[data-panel-id="lesson-tool"]')
  const content = page.locator('[data-panel-id="lesson-content"]')
  for (const width of [958, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => {
        const left = await content.boundingBox(),
          right = await tool.boundingBox()
        if (!left || !right) return false
        return width === 1440
          ? right.x >= left.x + left.width
          : right.y - (left.y + left.height) >= 23
      })
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

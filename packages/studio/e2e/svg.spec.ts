import { expect, type Page, test } from '@playwright/test'
import { expectToolboxGroupsToFit } from './helpers/responsiveToolbox'

const SVG_GROUPS = ['🖼️ Estrutura', '⬛ Formas', '🔤 Texto', '🎨 Aparência'] as const

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function openSvgShapes(page: Page): Promise<void> {
  await page.locator('.blocklyToolboxCategory').filter({ hasText: 'SVG' }).first().click()
  await page.locator('.blocklyToolboxCategory').filter({ hasText: 'Formas' }).first().click()
  await expect(page.locator('.blocklyToolboxFlyout')).toBeVisible()
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeVisible()
}

test.describe('SVG — fluxo infantil', () => {
  test('código SVG acessível vira blocos e continua visível no preview', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'index.html' }).click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('.monaco-editor .view-line').first().click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.insertText(
      '<!doctype html><html><head><title>SVG</title><link rel="stylesheet" href="style.css"></head><body><svg id="quadro" viewBox="0 0 200 200" aria-labelledby="nome descricao"><title id="nome">Planeta</title><desc id="descricao">Um planeta roxo</desc><circle id="planeta" class="forma" cx="100" cy="100" r="55"></circle></svg><script src="script.js"></script></body></html>',
    )

    await page.getByRole('button', { name: 'style.css' }).click()
    await page.locator('.monaco-editor .view-line').first().click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.insertText('.forma { fill: #a78bfa; stroke: #fbbf24; stroke-width: 6; }')

    const preview = page.frameLocator('iframe')
    await expect(preview.locator('#planeta')).toBeVisible({ timeout: 15_000 })
    await expect(preview.locator('title#nome')).toHaveText('Planeta')

    await page.getByRole('button', { name: 'Blocos' }).click()
    await openSvgShapes(page)
    await expect(page.locator('.blocklyToolboxFlyout')).toContainText('Desenhar círculo')
  })

  test('todas as paletas SVG cabem na largura de um celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await createProject(page)
    await expectToolboxGroupsToFit(page, 'SVG', SVG_GROUPS)
  })
})

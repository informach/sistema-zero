import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function replaceEditorContent(page: Page, code: string): Promise<void> {
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(code)
}

test.describe('Aprender CSS — resultado visual e Ponte', () => {
  test('estilo aparece, vira bloco amigável e oferece as partes criadas no HTML', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()

    await page.getByRole('button', { name: 'index.html' }).first().click()
    await replaceEditorContent(
      page,
      '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><div id="caixa" class="cartao">Meu cartão</div></body></html>',
    )
    await page.getByRole('button', { name: 'style.css' }).first().click()
    await replaceEditorContent(
      page,
      '#caixa { background-color: #7c3aed; color: #ffffff; padding: 24px; border-radius: 12px; }',
    )

    const card = page.frameLocator('iframe[title="Pré-visualização"]').locator('#caixa')
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(
        () =>
          card.evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              background: style.backgroundColor,
              color: style.color,
              padding: style.paddingTop,
              radius: style.borderTopLeftRadius,
            }
          }),
        { timeout: 15_000 },
      )
      .toEqual({
        background: 'rgb(124, 58, 237)',
        color: 'rgb(255, 255, 255)',
        padding: '24px',
        radius: '12px',
      })

    await page.getByRole('button', { name: 'Blocos' }).click()
    await page.getByRole('button', { name: 'Ocultar pré-visualização' }).click()
    const backgroundBlock = page
      .locator('text.blocklyText', { hasText: 'Pintar o fundo de' })
      .locator('xpath=ancestor::*[contains(@class, "blocklyDraggable")][1]')
    await expect(backgroundBlock).toBeVisible({ timeout: 15_000 })

    await backgroundBlock.locator('text.blocklyText', { hasText: '#caixa' }).first().click()
    const picker = page.getByRole('group', { name: 'Escolher body, #caixa ou .cartao' })
    await expect(picker.getByRole('button', { name: 'body', exact: true })).toBeVisible()
    await expect(picker.getByRole('button', { name: '#caixa', exact: true })).toBeVisible()
    await expect(picker.getByRole('button', { name: '.cartao', exact: true })).toBeVisible()
    await picker.getByRole('button', { name: '#caixa', exact: true }).click()

    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'style.css' }).first().click()
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('#caixa', {
      timeout: 15_000,
    })
  })
})

import { expect, test } from '@playwright/test'

test('Rodar confirms the current buffer before an immediate reload, with autosave held', async ({
  page,
}) => {
  await page.goto('/?autosave-ms=600000')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  const stop = page.locator('[data-live-target="studio-stop"]')
  if (await stop.isEnabled()) await stop.click()
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.getByRole('textbox', { name: 'Editor content' }).waitFor({ state: 'visible' })
  await editor.locator('.view-line').first().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  const code = 'document.body.dataset.confirmedRevision = "saved-before-run";'
  // Type into Monaco rather than injecting a store snapshot; Rodar must flush its debounce.
  await page.keyboard.insertText(code)
  await page.locator('[data-live-target="studio-run"]').click()
  await expect(
    page.frameLocator('iframe[title="Pré-visualização"]').locator('body'),
  ).toHaveAttribute('data-confirmed-revision', 'saved-before-run')
  // No explicit Salvar, no wait for autosave or for the badge.
  await page.reload()
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  await expect(page.locator('.monaco-editor').first()).toContainText('saved-before-run')
  await expect(
    page.frameLocator('iframe[title="Pré-visualização"]').locator('body'),
  ).toHaveAttribute('data-confirmed-revision', 'saved-before-run')
})

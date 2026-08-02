import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  await expect(page.getByLabel('Espaço de trabalho do Blockly')).toBeVisible()
}

test.describe('Zappy do Studio', () => {
  test('abre no desktop sem remontar o Blockly e devolve o foco pelo teclado', async ({ page }) => {
    await createProject(page)
    const workspace = page.getByLabel('Espaço de trabalho do Blockly')
    await workspace.evaluate((element) => element.setAttribute('data-zappy-workspace', 'original'))

    const trigger = page.getByRole('button', { name: 'Abrir Zappy' })
    await trigger.focus()
    await trigger.press('Enter')

    const panel = page.getByRole('dialog', { name: 'Zappy do Studio' })
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('aria-modal', 'false')
    await expect(page.getByLabel('Sua dúvida para o Zappy')).toBeFocused()

    await page.getByLabel('Sua dúvida para o Zappy').fill('Onde coloco um texto?')
    await page.getByLabel('Sua dúvida para o Zappy').press('Enter')
    await expect(panel.getByText('Abra a categoria HTML')).toBeVisible()
    await expect(workspace).toHaveAttribute('data-zappy-workspace', 'original')

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('usa folha modal em tela estreita e chip abre a categoria real', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createProject(page)

    await page.getByRole('button', { name: 'Abrir Zappy' }).click()
    const panel = page.getByRole('dialog', { name: 'Zappy do Studio' })
    await expect(panel).toHaveAttribute('aria-modal', 'true')
    await expect(panel).toHaveCSS('left', '8px')
    await expect(panel).toHaveCSS('right', '8px')

    await page.getByLabel('Sua dúvida para o Zappy').fill('Qual bloco mostra texto?')
    await page.getByRole('button', { name: 'Perguntar' }).click()
    await panel.getByRole('button', { name: 'texto' }).click()

    await expect(panel).toBeHidden()
    await expect(
      page.locator('.blocklyToolboxCategory').filter({ hasText: 'HTML' }).first(),
    ).toBeVisible()
  })
})

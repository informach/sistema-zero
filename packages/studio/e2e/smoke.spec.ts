import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

test.describe('Sistema Zero Studio — smoke', () => {
  test('IDE carrega com Topbar + categorias do Blockly + preview', async ({ page }) => {
    await createProject(page)
    await expect(page.getByRole('button', { name: 'Blocos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ponte' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Código' })).toBeVisible()
    // Categorias da toolbox no modo Blocos (default).
    await expect(page.getByText('HTML', { exact: true })).toBeVisible()
    await expect(page.getByText('CSS', { exact: true })).toBeVisible()
    await expect(page.getByText('Canvas', { exact: true })).toBeVisible()
    // Console panel disponível
    await expect(page.getByRole('button', { name: 'Console' })).toBeVisible()
  })

  test('primeiro clique em categoria do Blockly mantém o flyout aberto', async ({ page }) => {
    await createProject(page)

    await page.locator('.blocklyToolboxCategory').filter({ hasText: 'CSS' }).first().click()
    const flyout = page.locator('.blocklyToolboxFlyout')
    await expect(flyout).toBeVisible()

    // Regressão: antes o update inicial da toolbox fechava o flyout em menos de 1s.
    await page.waitForTimeout(800)
    await expect(flyout).toBeVisible()
  })

  test('primeiro clique em Pesquisar abre o input dentro do flyout', async ({ page }) => {
    await createProject(page)

    await page.locator('.blocklyToolboxCategory').filter({ hasText: 'Pesquisar' }).first().click()
    await expect(page.locator('.blocklyToolboxFlyout')).toBeVisible()
    await expect(page.locator('input#toolbox-search-input')).toBeVisible()

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const input = document.querySelector('input#toolbox-search-input')
          const flyout = document.querySelector('.blocklyToolboxFlyout')
          if (!input || !flyout) return false
          const inputRect = input.getBoundingClientRect()
          const flyoutRect = flyout.getBoundingClientRect()
          return (
            getComputedStyle(input).visibility === 'visible' &&
            flyoutRect.width > 0 &&
            flyoutRect.height > 0 &&
            inputRect.left >= flyoutRect.left &&
            inputRect.top >= flyoutRect.top &&
            inputRect.right <= flyoutRect.right &&
            inputRect.bottom <= flyoutRect.bottom
          )
        }),
      )
      .toBe(true)
  })

  test('Painel Extensões mostra catálogo oficial (game-2d)', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Extensões' }).click()
    await expect(page.getByText('Jogo 2D')).toBeVisible()
    await expect(page.getByText('Disponível').or(page.getByText('Instalada'))).toBeVisible()
  })

  test('Menu do projeto fica acima do card e exclusão usa modal própria', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.type())
      await dialog.dismiss()
    })

    await createProject(page)
    await page.getByRole('button', { name: 'Meus projetos' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('button', { name: 'Mais ações' }).first().click()
    const exportItem = page.getByRole('menuitem', { name: 'Exportar' })
    await expect(exportItem).toBeVisible()

    const topHit = await exportItem.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return { role: hit?.getAttribute('role'), text: hit?.textContent?.trim() }
    })
    expect(topHit).toEqual({ role: 'menuitem', text: 'Exportar' })

    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Excluir o projeto 'Meu projeto'?")).toBeVisible()
    expect(dialogs).toEqual([])
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('Projeto novo começa sem logs no console', async ({ page }) => {
    await createProject(page)
    await expect(
      page.getByText('Sem mensagens. Use console.log para registrar algo.'),
    ).toBeVisible()
    await expect(page.getByText('Sistema Zero: pronto para programar!')).not.toBeVisible()
  })

  test('AIPanel mostra badge MOCK por padrão (sem chave OpenRouter)', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByRole('button', { name: 'IA' }).nth(1).click()
    await expect(page.getByText('mock', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configurar IA' }).first()).toBeVisible()
  })

  test('Modo Ponte tem blocos + Monaco + preview', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await expect(page.getByRole('button', { name: 'index.html' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'script.js' })).toBeVisible()
  })

  test('Código editado permanece ao alternar para Ponte', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByRole('button', { name: 'script.js' }).first().click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('.monaco-editor .view-line').first().click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('document.body.innerHTML = "<h1>Persistiu</h1>";')

    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: 'Persistiu' }),
    ).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('button', { name: 'Ponte' }).click()
    await expect(page.getByRole('button', { name: 'script.js' })).toBeVisible()
    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: 'Persistiu' }),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Preview executa automaticamente ao abrir e recarregar o editor', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByRole('button', { name: 'script.js' }).first().click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('.monaco-editor .view-line').first().click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('document.body.innerHTML = "<h1>Preview apos reload</h1>";')

    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Salvo')).toBeVisible({ timeout: 10_000 })

    await page.reload()

    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: 'Meus projetos' }).click()
    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Abrir' }).first().click()

    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Modo Código permite criar arquivo extra seguro', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByPlaceholder('novo.js').fill('helper-smoke.mjs')
    await page.getByRole('button', { name: '+ Novo arquivo' }).click()
    await expect(
      page.getByRole('complementary').getByRole('button', { name: 'helper-smoke.mjs' }),
    ).toBeVisible()
  })

  test('Terminal real aparece como CTA sem quebrar a IDE', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByRole('button', { name: 'Terminal' }).click()
    await expect(page.getByRole('button', { name: 'Carregar terminal real' })).toBeVisible()
  })

  test('Terminal real inicializa WebContainer e monta arquivos do projeto', async ({ page }) => {
    test.slow()
    await createProject(page)
    await page.getByRole('button', { name: 'Código' }).click()
    await page.getByRole('button', { name: 'Terminal' }).click()
    await page.getByRole('button', { name: 'Carregar terminal real' }).click()

    await expect(page.getByText('Carregando WebContainers...')).toBeVisible()
    await expect(page.locator('.xterm')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.xterm-rows')).toContainText('Sistema Zero Studio terminal', {
      timeout: 60_000,
    })
    await expect(page.locator('.xterm-rows')).toContainText('Arquivos do projeto montados', {
      timeout: 60_000,
    })
  })
})

import { expect, type Page, test } from '@playwright/test'

// Modelo D2 (src/core/modes.ts): projeto BÁSICO expõe só Blocos + Ponte — o
// editor de código do clássico vive na PONTE; projeto PROFISSIONAL (radio
// "Pro (código)" no modal "+ Novo projeto") expõe só Código (árvore Vite +
// WebContainer). Nenhum projeto mostra os 3 modos ao mesmo tempo.

async function createProject(page: Page, initialPath = '/'): Promise<void> {
  await page.goto(initialPath)
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function createProProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByText('Pro (código)', { exact: true }).click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  // Esconde o preview: no PRO ele bota um WebContainer + npm install em
  // background — peso/rede que os cenários abaixo não usam e que saturava o
  // servidor de dev (o último teste da suíte estourava timeout).
  await page.getByRole('button', { name: 'Ocultar pré-visualização' }).click()
}

/** Abre a Ponte, foca o script.js e limpa o conteúdo (pronto p/ digitar). */
async function openBridgeScript(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
}

async function expectSearchContentBelowField(page: Page, content: ReturnType<Page['locator']>) {
  const searchInput = page.locator('input#toolbox-search-input')

  await expect
    .poll(async () => {
      const [inputRect, contentRect, focusOutset] = await Promise.all([
        searchInput.boundingBox(),
        content.boundingBox(),
        searchInput.evaluate((input) => {
          const inputStyle = getComputedStyle(input)
          return (
            Number.parseFloat(inputStyle.outlineWidth) + Number.parseFloat(inputStyle.outlineOffset)
          )
        }),
      ])
      if (!inputRect || !contentRect || !Number.isFinite(focusOutset)) return false
      const visibleGap = contentRect.y - (inputRect.y + inputRect.height + focusOutset)
      return visibleGap >= 8
    })
    .toBe(true)
}

async function openSearchAndExpectClearance(page: Page): Promise<void> {
  await page.locator('.blocklyToolboxCategory').filter({ hasText: 'Pesquisar' }).first().click()
  await expect(page.locator('.blocklyToolboxFlyout')).toBeVisible()
  const searchInput = page.locator('input#toolbox-search-input')
  const searchInstruction = page
    .locator('.blocklyFlyoutLabelText')
    .filter({ hasText: 'Escreva para achar' })
    .first()
  await expect(searchInput).toBeVisible()
  await expect(searchInput).toBeFocused()
  await expect(searchInstruction).toBeVisible()

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

  await expectSearchContentBelowField(page, searchInstruction)
}

test.describe('Sistema Zero Studio — smoke', () => {
  test('layout wide sem painel inferior ocupa 100% sem normalização', async ({ page }) => {
    const layoutWarnings: string[] = []
    page.on('console', (message) => {
      if (message.text().includes('Invalid layout total size')) layoutWarnings.push(message.text())
    })

    await createProject(page)
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)
    await expect(page.locator('main')).toBeVisible()
    expect(layoutWarnings).toEqual([])
  })

  test('Console começa oculto em Blocos e respeita a escolha manual entre modos', async ({
    page,
  }) => {
    await createProject(page)
    // Básico = Blocos + Ponte; o modo Código NÃO existe no clássico (D2).
    await expect(page.getByRole('button', { name: 'Blocos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ponte' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Código', exact: true })).toHaveCount(0)
    // Categorias da toolbox no modo Blocos (default).
    await expect(page.getByText('HTML', { exact: true })).toBeVisible()
    await expect(page.getByText('CSS', { exact: true })).toBeVisible()
    await expect(page.getByText('Canvas', { exact: true })).toBeVisible()
    // Em Blocos, o Console começa oculto, mas continua acessível pelo menu.
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Mais opções' }).click()
    const consoleItem = page.getByRole('menuitem', { name: 'Console' })
    await expect(consoleItem).not.toHaveAttribute('aria-current', 'true')
    await consoleItem.click()
    await expect(page.getByRole('tab', { name: 'Console' })).toBeVisible()

    // A primeira escolha manual prevalece ao trocar para Ponte.
    await page.getByRole('button', { name: 'Ponte' }).click()
    await expect(page.getByRole('tab', { name: 'Console' })).toBeVisible()

    // O mesmo item oculta novamente e a escolha continua valendo em Blocos.
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await expect(page.getByRole('menuitem', { name: 'Console' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await page.getByRole('menuitem', { name: 'Console' }).click()
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)
  })

  test('toolbox: folha abre flyout (e permanece); categoria-pai expande', async ({ page }) => {
    await createProject(page)

    // "Áreas do projeto" é FOLHA (sem subcategorias): o 1º clique abre o flyout.
    await page
      .locator('.blocklyToolboxCategory')
      .filter({ hasText: 'Áreas do projeto' })
      .first()
      .click()
    const flyout = page.locator('.blocklyToolboxFlyout')
    await expect(flyout).toBeVisible()

    // Regressão histórica: um updateToolbox tardio fechava o flyout em menos de 1s.
    await page.waitForTimeout(800)
    await expect(flyout).toBeVisible()

    // Categoria com SUBCATEGORIAS (arco-íris): o 1º clique EXPANDE (não abre
    // flyout) — a subcategoria "🧰 Regra" fica visível.
    await page.locator('.blocklyToolboxCategory').filter({ hasText: 'CSS' }).first().click()
    await expect(
      page.locator('.blocklyToolboxCategory').filter({ hasText: 'Regra' }).first(),
    ).toBeVisible()
  })

  test('primeiro clique em Pesquisar abre e foca o input sem cobrir a instrução', async ({
    page,
  }) => {
    await createProject(page)
    await openSearchAndExpectClearance(page)
  })

  test('Pesquisar reserva espaço para instrução e resultados no flyout horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await createProject(page)
    await openSearchAndExpectClearance(page)

    const searchInput = page.locator('input#toolbox-search-input')
    await searchInput.fill('mover')
    const firstResult = page.locator('.blocklyToolboxFlyout .blocklyDraggable').first()
    await expect(firstResult).toBeVisible()
    await expectSearchContentBelowField(page, firstResult)
  })

  test('Painel Extensões mostra catálogo oficial (game-2d)', async ({ page }) => {
    await createProject(page)
    // Extensões vive no menu ⋯ da Topbar (seção Exibição).
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Extensões' }).click()
    const game2dCard = page.getByRole('listitem').filter({ hasText: 'Jogo 2D' }).first()
    await expect(game2dCard.getByText('Jogo 2D', { exact: true })).toBeVisible()
    await expect(game2dCard.getByRole('button', { name: 'Instalar', exact: true })).toBeVisible()
  })

  test('Menu do projeto fica acima do card e exclusão usa modal própria', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.type())
      await dialog.dismiss()
    })

    await createProject(page)
    // Voltar à lista = clicar o logo (title "Voltar à lista de projetos").
    await page.getByRole('button', { name: 'Sistema Zero Studio' }).click()
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
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Console' }).click()
    await expect(
      page.getByText('Sem mensagens. Use console.log para registrar algo.'),
    ).toBeVisible()
    await expect(page.getByText('Sistema Zero: pronto para programar!')).not.toBeVisible()
  })

  test('Console preserva mensagens produzidas enquanto está oculto', async ({ page }) => {
    await createProject(page)
    await openBridgeScript(page)
    await page.keyboard.type(
      'document.body.innerHTML = "<h1>Executou oculto</h1>"; console.log("log oculto retido");',
    )

    // Ver o resultado no preview prova que o script e seu console.log rodaram
    // antes de o painel ser aberto.
    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Executou oculto' }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Console' }).click()
    await expect(
      page.getByLabel('Console', { exact: true }).getByText('log oculto retido', { exact: true }),
    ).toBeVisible()
  })

  test('Projeto novo começa sem áreas e oferece as seis áreas separadas', async ({ page }) => {
    await createProject(page)
    await expect(page.locator('.blocklyWorkspace .blocklyDraggable')).toHaveCount(0)

    await page
      .locator('.blocklyToolboxCategory')
      .filter({ hasText: 'Áreas do projeto' })
      .first()
      .click()

    const flyout = page.locator('.blocklyToolboxFlyout')
    await expect(flyout).toContainText('Estrutura: HTML')
    await expect(flyout).toContainText('Aparência: CSS')
    await expect(flyout).toContainText('Meus moldes')
    await expect(flyout).toContainText('Ao iniciar')
    await expect(flyout).toContainText('Quando acontecer')
    await expect(flyout).toContainText('Enquanto estiver rodando')
  })

  test('Pro standalone não oferece um segundo painel de IA local', async ({ page }) => {
    await createProProject(page)
    await expect(page.getByRole('button', { name: 'Console', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'IA' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Configurar IA' })).toHaveCount(0)
  })

  test('Modo Ponte tem blocos + Monaco + preview', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await expect(page.getByRole('tab', { name: 'Console' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'index.html' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'script.js' })).toBeVisible()
  })

  test('Pensa: recolher e abrir preserva editor e histórico', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    await createProject(page, '/?missao=adiada')
    await openBridgeScript(page)
    const codigo = page.locator('.monaco-editor .view-lines').first()
    const workspace = await page.getByLabel('Espaço de trabalho do Blockly').elementHandle()
    const monaco = await page.locator('.monaco-editor').first().elementHandle()
    if (!workspace || !monaco) throw new Error('Editores reais indisponíveis')
    const mission = page.getByRole('complementary', { name: 'Missão do Pensa', exact: true })
    await expect(mission).toHaveCount(0)
    const source = 'document.body.dataset.pensa = "preservado";\n// '
    const marker = 'controlepensa'
    await page.keyboard.insertText(source)

    async function sameEditors() {
      expect(
        await workspace!.evaluate(
          (original) =>
            original.isConnected &&
            original === document.querySelector('[aria-label="Espaço de trabalho do Blockly"]'),
        ),
      ).toBe(true)
      expect(
        await monaco!.evaluate(
          (original) =>
            original.isConnected && original === document.querySelector('.monaco-editor'),
        ),
      ).toBe(true)
    }

    await codigo.click()
    await page.keyboard.press('ControlOrMeta+End')
    // Uma palavra só, como o controle de Undo existente: um grupo de digitação.
    await page.keyboard.type(marker)
    await expect(codigo).toContainText(marker)

    // O gesto desfazível precede a chegada: não basta preservar só o histórico posterior.
    await page.getByRole('button', { name: 'Mostrar missão de demonstração', exact: true }).click()
    await expect(mission).toBeVisible()
    await sameEditors()
    await expect(codigo).toContainText('preservado')
    await expect(codigo).toContainText(marker)
    const toggle = mission.getByRole('button', { name: /Fazer o herói pular/ })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await sameEditors()
    await expect(codigo).toContainText(marker)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await sameEditors()

    await page.getByRole('button', { name: 'Remover missão de demonstração', exact: true }).click()
    await expect(mission).toHaveCount(0)
    await sameEditors()
    await page.getByRole('button', { name: 'Mostrar missão de demonstração', exact: true }).click()
    await expect(mission).toBeVisible()
    await sameEditors()
    await expect(codigo).toContainText(marker)
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await expect(codigo).not.toContainText(marker)
    await expect(codigo).toContainText('preservado')
    await sameEditors()
    await page.getByRole('button', { name: 'Refazer', exact: true }).click()
    await expect(codigo).toContainText(marker)

    const projectId = page.url().split('/editor/')[1] ?? ''
    expect(projectId).not.toBe('')
    const savedScript = () =>
      page.evaluate(async (id) => {
        const db: IDBDatabase = await new Promise((resolve, reject) => {
          const request = indexedDB.open('sistema-zero-studio')
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        try {
          const stored = await new Promise<{ files?: Record<string, string> } | undefined>(
            (resolve, reject) => {
              const request = db
                .transaction('kv', 'readonly')
                .objectStore('kv')
                .get(`sz:v3:project-files:${id}`)
              request.onsuccess = () => resolve(request.result)
              request.onerror = () => reject(request.error)
            },
          )
          return stored?.files?.['script.js']?.replace(/\r\n/g, '\n') ?? null
        } finally {
          db.close()
        }
      }, projectId)
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Salvar', exact: true }).click()
    await expect.poll(savedScript).toBe(source + marker)
    await page.getByRole('button', { name: 'Sistema Zero Studio', exact: true }).click()
    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Abrir', exact: true }).first().click()
    await expect(page).toHaveURL(/\/editor\//)
    // Reabrir é uma montagem intencional; a identidade acima só vale para a sessão aberta.
    await page.getByRole('button', { name: 'Ponte', exact: true }).click()
    await page.getByRole('button', { name: 'script.js', exact: true }).first().click()
    await expect(codigo).toContainText(marker)
    await expect.poll(savedScript).toBe(source + marker)
    await page.screenshot({ path: testInfo.outputPath('pensa-editor-source-preserved.png') })
  })

  test('Código digitado na Ponte sobrevive à troca IMEDIATA para Blocos', async ({ page }) => {
    await createProject(page)
    await openBridgeScript(page)
    await page.keyboard.type('document.body.innerHTML = "<h1>Persistiu</h1>";')

    // Troca DENTRO da janela do reverse-parse (~0,9s de debounce + worker, que
    // morre com a Ponte): a regressão regenerava os arquivos a partir dos
    // blocos VELHOS e perdia o código digitado. Com as épocas de sincronização,
    // o BlocksMode deriva os blocos do código e os arquivos ficam intactos.
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Persistiu' }),
    ).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'script.js' }).first().click()
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('Persistiu', {
      timeout: 10_000,
    })
    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Persistiu' }),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Preview executa automaticamente ao abrir e recarregar o editor', async ({ page }) => {
    await createProject(page)
    await openBridgeScript(page)
    await page.keyboard.type('document.body.innerHTML = "<h1>Preview apos reload</h1>";')

    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 15_000,
    })

    // "Salvar" vive no menu ⋯ da Topbar (decisão de UX kids).
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Salvar' }).click()
    await expect(page.getByText('Salvo')).toBeVisible({ timeout: 10_000 })

    await page.reload()

    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: 'Sistema Zero Studio' }).click()
    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Abrir' }).first().click()

    await expect(
      page
        .frameLocator('iframe[title="Pré-visualização"]')
        .getByRole('heading', { name: 'Preview apos reload' }),
    ).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Modo Código (PRO) permite criar arquivo na árvore', async ({ page }) => {
    await createProProject(page)
    await page.getByTitle('Novo arquivo na raiz').click()
    await page.getByLabel('Nome do novo item').fill('helper-smoke.mjs')
    await page.getByRole('button', { name: 'Criar', exact: true }).click()
    await expect(page.getByText('helper-smoke.mjs')).toBeVisible()
  })

  test('Terminal (PRO) aparece como CTA sem quebrar a IDE', async ({ page }) => {
    // A aba Terminal só existe no modo Código (D2) → projeto profissional.
    await createProProject(page)
    await page.getByRole('button', { name: 'Terminal', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Carregar terminal real' })).toBeVisible()
  })

  test('Terminal real inicializa WebContainer e monta arquivos do projeto', async ({ page }) => {
    test.slow()
    await createProProject(page)
    await page.getByRole('button', { name: 'Terminal', exact: true }).click()
    await page.getByRole('button', { name: 'Carregar terminal real' }).click()

    await expect(page.locator('.xterm')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.xterm-rows')).toContainText('Sistema Zero Studio terminal', {
      timeout: 60_000,
    })
    await expect(page.locator('.xterm-rows')).toContainText('Arquivos do projeto montados', {
      timeout: 60_000,
    })
  })
})

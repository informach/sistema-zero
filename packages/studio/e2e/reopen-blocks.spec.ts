import { expect, type Page, test } from '@playwright/test'

/**
 * Regressão do "blocos não renderizam ao reabrir": criar um projeto de blocos,
 * salvar e recarregar TEM que mostrar os blocos imediatamente — sem alternar
 * para a Ponte. Cobre o núcleo e um projeto com extensão (Jogo 2D), além da
 * reabertura via lista ("Meus projetos" → "Abrir"), e afere que nenhum
 * `blocksState` foi rejeitado pelo sanitizer no caminho.
 */

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

/** Cola uma subárvore no canvas via clipboard durável (mesmo caminho da UI). */
async function pasteBlocks(
  page: Page,
  block: Record<string, unknown>,
  requiredExtensions: string[] = [],
): Promise<void> {
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions, copiedAt: Date.now() })],
  )
  await page
    .locator('.blocklySvg')
    .first()
    .click({ button: 'right', position: { x: 420, y: 280 } })
  await page.getByText('Colar blocos', { exact: true }).click()
}

/** Espera o badge de autosave confirmar a gravação. */
async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 10_000 })
}

/**
 * Blocos presentes E visíveis dentro do painel do Blockly — pega tanto o caso
 * "dado nunca chegou" (sem-blocos) quanto o "renderizou fora da viewport"
 * (fora-da-viewport, a causa do canvas 'vazio' sem scrollCenter).
 */
async function expectBlocksVisibleInPanel(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const panel = document.querySelector('.blocklySvg')
          if (!panel) return 'sem-svg'
          const panelRect = panel.getBoundingClientRect()
          const blocks = Array.from(
            document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable'),
          )
          if (blocks.length === 0) return 'sem-blocos'
          const visible = blocks.some((el) => {
            const r = el.getBoundingClientRect()
            return (
              r.width > 0 &&
              r.height > 0 &&
              r.left < panelRect.right &&
              r.right > panelRect.left &&
              r.top < panelRect.bottom &&
              r.bottom > panelRect.top
            )
          })
          return visible ? 'ok' : 'fora-da-viewport'
        }),
      { timeout: 15_000 },
    )
    .toBe('ok')
}

function collectSanitizerWarns(page: Page): string[] {
  const warns: string[] = []
  page.on('console', (message) => {
    if (/blocksState rejeitado/.test(message.text())) warns.push(message.text())
  })
  return warns
}

test.describe('Reabrir projeto de blocos — renderiza de primeira', () => {
  test('núcleo: colar bloco → salvo → reload mostra os blocos SEM alternar de modo', async ({
    page,
  }) => {
    const warns = collectSanitizerWarns(page)
    await createProject(page)
    await pasteBlocks(page, {
      type: 'sz_js_console_log_text',
      fields: { VALUE: 'reabrir ok' },
    })
    await expectBlocksVisibleInPanel(page)
    await waitForSaved(page)

    await page.reload()

    // SEM clicar em nenhum botão de modo: os blocos têm que estar lá.
    await expectBlocksVisibleInPanel(page)
    expect(warns).toEqual([])
  })

  test('jogo (extensão game-2d): reload mostra os blocos e o sanitizer não rejeita', async ({
    page,
  }) => {
    const warns = collectSanitizerWarns(page)
    await createProject(page)
    // O colar auto-instala a extensão que falta (mesmo fluxo real da UI).
    await pasteBlocks(page, { type: 'sz_g2d_update_each_frame' }, ['game-2d'])
    await expectBlocksVisibleInPanel(page)
    await waitForSaved(page)

    await page.reload()

    await expectBlocksVisibleInPanel(page)
    expect(warns).toEqual([])
  })

  test('reabrir pela lista (Meus projetos → Abrir) também renderiza de primeira', async ({
    page,
  }) => {
    await createProject(page)
    await pasteBlocks(page, {
      type: 'sz_js_console_log_text',
      fields: { VALUE: 'pela lista' },
    })
    await expectBlocksVisibleInPanel(page)
    await waitForSaved(page)

    // O botão de sair é o LOGO da Topbar (nome acessível = alt do logotipo).
    await page.getByRole('button', { name: 'Sistema Zero Studio' }).click()
    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Abrir' }).first().click()
    await expect(page).toHaveURL(/\/editor\//)

    await expectBlocksVisibleInPanel(page)
  })

  test('layout salvo LONGE da origem volta para a viewport (scrollCenter pós-load)', async ({
    page,
  }) => {
    await createProject(page)
    // Panoramiza o canvas para LONGE da origem ANTES de colar: o colar posiciona
    // no viewport atual, então o bloco nasce com x/y grandes. No reload, o
    // viewport volta ao padrão — sem o recentro pós-load, o bloco renderizava
    // fora da tela e o canvas parecia vazio.
    const svg = page.locator('.blocklySvg').first()
    const box = await svg.boundingBox()
    if (!box) throw new Error('painel do Blockly sem bounding box')
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.25, { steps: 8 })
      await page.mouse.up()
    }
    await pasteBlocks(page, {
      type: 'sz_js_console_log_text',
      fields: { VALUE: 'longe' },
    })
    await expectBlocksVisibleInPanel(page)
    await waitForSaved(page)

    await page.reload()

    await expectBlocksVisibleInPanel(page)
  })
})

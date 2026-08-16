import { expect, type Page, test } from '@playwright/test'

/**
 * Cenário RELATADO por ela (15/08), reproduzido passo a passo:
 *
 * "tenho um projeto com as três áreas vazias; copiei os blocos de DENTRO da área
 *  de outro projeto (a área mesmo não cola), colei aqui, arrastei para dentro do
 *  Ao iniciar — e a tela ficou em branco. Deveria ter pelo menos pintado a cor
 *  que eu escolhi no bloco 'preparar o jogo', não?"
 *
 * O observável decisivo é o `srcdoc` do iframe de preview: ele diz, sem
 * adivinhação, se o runtime do Jogo 2D entrou no documento e se o programa
 * chama o `setupStage`. É lido A CADA PASSO.
 */

const COR = '#ff8800'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

/** Documento montado para o preview (o iframe é sandbox: lemos o ATRIBUTO). */
async function previewDoc(page: Page): Promise<string> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe'))
      .map((frame) => frame.getAttribute('srcdoc') ?? '')
      .join('\n<!--/-->\n'),
  )
}

function generatedProgram(doc: string): string {
  const encoded = doc.match(/data:text\/javascript;base64,([^"\\]+)/)?.[1]
  return encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '(sem script)'
}

/** Põe uma Área do projeto pelo caminho REAL: gaveta 🗂️ → clique no bloco. */
async function addArea(page: Page, label: string): Promise<void> {
  // ⚠️ O clique vai na CATEGORIA, não no <span> do rótulo: o div pai intercepta
  // os eventos de ponteiro e o clique no span nunca chega.
  await page.locator('.blocklyToolboxCategory', { hasText: '🗂️ Áreas do projeto' }).first().click()
  await page.locator('.blocklyFlyout').getByText(label, { exact: false }).first().click()
  await expect(
    page.locator('.blocklyBlockCanvas').getByText(label, { exact: false }).first(),
  ).toBeVisible()
}

/** Cola uma subárvore pelo menu de contexto REAL (mesmo caminho da UI). */
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
    .click({ button: 'right', position: { x: 620, y: 420 } })
  await page.getByText('Colar blocos', { exact: true }).click()
}

/** Arrasta com o MOUSE (gesto real) o bloco `de` até encostar em `para`. */
async function dragOnto(page: Page, de: string, para: string): Promise<void> {
  const origem = page.locator('.blocklyBlockCanvas').getByText(de, { exact: false }).first()
  const destino = page.locator('.blocklyBlockCanvas').getByText(para, { exact: false }).first()
  const a = await origem.boundingBox()
  const b = await destino.boundingBox()
  if (!a || !b) throw new Error(`sem bounding box: ${de} / ${para}`)
  await page.mouse.move(a.x + 8, a.y + a.height / 2)
  await page.mouse.down()
  // O encaixe do CHILDREN fica abaixo e à direita do rótulo da área.
  await page.mouse.move(b.x + 34, b.y + b.height + 26, { steps: 24 })
  await page.mouse.up()
}

test.describe('colar blocos de outro projeto e arrastar para a Área', () => {
  test('só o "preparar o jogo" no Ao iniciar já tem que pintar a cor', async ({ page }) => {
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(String(e)))

    await createProject(page)

    // 1) As três áreas VAZIAS, como no projeto dela.
    await addArea(page, 'Ao iniciar')
    await addArea(page, 'Quando acontecer')
    await addArea(page, 'Enquanto estiver rodando')

    // 2) Cola o bloco do palco que veio do OUTRO projeto (só o bloco, sem a área).
    await pasteBlocks(
      page,
      {
        type: 'sz_g2d_setup_stage',
        fields: { BG: COR },
        inputs: {
          W: { shadow: { type: 'sz_val_number', fields: { NUM: 480 } } },
          H: { shadow: { type: 'sz_val_number', fields: { NUM: 320 } } },
        },
      },
      ['game-2d'],
    )
    await expect(
      page.locator('.blocklyBlockCanvas').getByText('Preparar o jogo', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 })

    // 3) Arrasta o rascunho para DENTRO do Ao iniciar.
    await dragOnto(page, 'Preparar o jogo', 'Ao iniciar')

    // A pré-condição do cenário é estrutural: o bloco precisa estar aninhado na
    // Área. Se o gesto errar, a falha aponta o arrasto — não a geração do preview.
    const nested = await page
      .locator('.blocklyBlockCanvas')
      .getByText('Preparar o jogo', { exact: false })
      .first()
      .evaluate((label) => {
        const block = label.closest('g.blocklyDraggable')
        return Boolean(block?.parentElement?.closest('g.blocklyDraggable'))
      })
    expect(nested).toBe(true)

    await expect
      .poll(async () => generatedProgram(await previewDoc(page)), { timeout: 15_000 })
      .toContain(COR)
    const liveProgram = generatedProgram(await previewDoc(page))

    // O programa vivo e o restaurado devem ser idênticos: isso cobre, de uma vez,
    // geração após o gesto e persistência da árvore aninhada.
    await page.reload()
    await expect(
      page.locator('.blocklyBlockCanvas').getByText('Preparar o jogo', { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 })
    await expect
      .poll(async () => generatedProgram(await previewDoc(page)), { timeout: 15_000 })
      .toBe(liveProgram)
    expect(liveProgram).toContain(COR)
    expect(erros).toEqual([])
  })
})

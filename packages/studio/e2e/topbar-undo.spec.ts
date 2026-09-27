import { expect, type Page, test } from '@playwright/test'
import { pasteBlocklyBlocks } from './helpers/blockly'

/**
 * Desfazer e refazer na barra do editor (11/09/2026, a tela-modelo do Estúdio). Os botões falam
 * com a pilha do editor em uso: os blocos no modo Blocos e, na Ponte, o último editor que a
 * criança tocou. Depois que o código reconstrói os blocos, a pilha dos blocos de antes é
 * esquecida (o Blockly nunca a limpa sozinho).
 */
async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  await expect(page.getByLabel('Espaço de trabalho do Blockly')).toBeVisible()
}

/** Só os blocos de topo do canvas principal (o flyout da categoria tem o próprio workspace). */
function mainBlocks(page: Page) {
  return page.locator(
    'svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > g.blocklyDraggable',
  )
}

/** Arrasta uma Área do projeto da paleta para o canvas: o Blockly empilha isso (é desfazível). */
async function dragAreaFromFlyout(page: Page, label: string): Promise<void> {
  const category = page
    .locator('.blocklyToolboxCategory')
    .filter({ hasText: 'Áreas do projeto' })
    .first()
  const source = page
    .locator('.blocklyToolboxFlyout .blocklyDraggable')
    .filter({ hasText: label })
    .first()
  if (!(await source.isVisible())) await category.click()
  await expect(source).toBeVisible()
  const sourceBox = await source.boundingBox()
  const target = await page.evaluate(() => {
    const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
    if (!background) return null
    for (let y = background.bottom - 64; y > background.top + 64; y -= 32) {
      for (let x = background.right - 64; x > background.left + 64; x -= 32) {
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
          return { x, y }
        }
      }
    }
    return null
  })
  if (!sourceBox || !target) throw new Error('Área ou workspace sem ponto interativo')
  await page.mouse.move(sourceBox.x + 5, sourceBox.y + 5)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
}

/** Um toque num ponto VAZIO do canvas (é o gesto que faz dos blocos o alvo da Ponte). */
async function touchBlocksCanvas(page: Page): Promise<void> {
  const point = await page.evaluate(() => {
    const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
    if (!background) return null
    for (let y = background.bottom - 24; y > background.top + 24; y -= 24) {
      for (let x = background.left + 24; x < background.right - 24; x += 24) {
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
          return { x, y }
        }
      }
    }
    return null
  })
  if (!point) throw new Error('Canvas sem ponto vazio')
  await page.mouse.click(point.x, point.y)
}

test.describe('Desfazer e refazer na barra do editor', () => {
  test('modo Blocos: os botões seguem a pilha dos blocos', async ({ page }) => {
    await createProject(page)
    const desfazer = page.getByRole('button', { name: 'Desfazer', exact: true })
    const refazer = page.getByRole('button', { name: 'Refazer', exact: true })
    await expect(desfazer).toHaveAttribute('title', 'Desfazer nos blocos (Ctrl+Z)')
    await expect(desfazer).toBeDisabled()
    await expect(refazer).toBeDisabled()

    await dragAreaFromFlyout(page, 'Ao iniciar')
    const area = mainBlocks(page).filter({ hasText: 'Ao iniciar' })
    await expect(area).toHaveCount(1)
    await expect(desfazer).toBeEnabled()

    await desfazer.click()
    await expect(area).toHaveCount(0)
    await expect(refazer).toBeEnabled()

    await refazer.click()
    await expect(area).toHaveCount(1)
  })

  test('Ponte: o alvo é o último editor tocado e o código desfaz o que foi digitado', async ({
    page,
  }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    const desfazer = page.getByRole('button', { name: 'Desfazer', exact: true })
    await expect(desfazer).toHaveAttribute('title', 'Desfazer nos blocos (Ctrl+Z)')

    const codigo = page.locator('.monaco-editor .view-lines').first()
    await expect(codigo).toBeVisible()
    await codigo.click()
    await expect(desfazer).toHaveAttribute('title', 'Desfazer no código (Ctrl+Z)')
    await page.keyboard.press('ControlOrMeta+End')
    // Uma palavra só: o Monaco agrupa a digitação por palavra, e cada clique desfaz um grupo
    // (como o Ctrl+Z dele).
    await page.keyboard.type('zqx')
    await expect(codigo).toContainText('zqx')
    await expect(desfazer).toBeEnabled()

    await desfazer.click()
    await expect(codigo).not.toContainText('zqx')
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled()

    // Tocar de novo nos blocos devolve o alvo a eles.
    await touchBlocksCanvas(page)
    await expect(desfazer).toHaveAttribute('title', 'Desfazer nos blocos (Ctrl+Z)')
  })

  test('Ponte: depois que o código reconstrói os blocos, o desfazer dos blocos esquece o de antes', async ({
    page,
  }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    const desfazer = page.getByRole('button', { name: 'Desfazer', exact: true })

    // Na Ponte o canvas é estreito e a paleta aberta o cobre: o passo desfazível aqui é MOVER um
    // bloco colado (colar não entra na pilha; mover entra).
    await pasteBlocklyBlocks(page, {
      type: 'sz_js_console_log_text',
      fields: { VALUE: 'mover' },
    })
    const colado = mainBlocks(page).filter({ hasText: 'mover' })
    await expect(colado).toHaveCount(1)
    const caixa = await colado.boundingBox()
    if (!caixa) throw new Error('O bloco colado não tem caixa')
    await page.mouse.move(caixa.x + 12, caixa.y + 8)
    await page.mouse.down()
    await page.mouse.move(caixa.x + 52, caixa.y + 48, { steps: 6 })
    await page.mouse.up()
    await expect(desfazer).toHaveAttribute('title', 'Desfazer nos blocos (Ctrl+Z)')
    await expect(desfazer).toBeEnabled()

    // O código muda os blocos: a Ponte recarrega o canvas a partir dele.
    const codigo = page.locator('.monaco-editor .view-lines').first()
    await codigo.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('<p>oi</p>')
    await expect(mainBlocks(page).filter({ hasText: 'Escrever parágrafo' })).toHaveCount(1, {
      timeout: 15_000,
    })

    await touchBlocksCanvas(page)
    await expect(desfazer).toHaveAttribute('title', 'Desfazer nos blocos (Ctrl+Z)')
    // Sem o esquecimento, o botão seguiria ligado e desfaria o arrasto de antes da recarga.
    await expect(desfazer).toBeDisabled()
  })

  test('celular: desfazer e refazer saem da barra e entram no "⋯", na seção Editar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createProject(page)
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Mais opções' }).click()
    const editar = page.getByRole('group', { name: 'Editar' })
    await expect(editar.getByRole('menuitem', { name: 'Desfazer' })).toBeDisabled()
    await expect(editar.getByRole('menuitem', { name: 'Refazer' })).toBeDisabled()
  })
})

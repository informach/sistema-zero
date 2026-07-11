import { expect, type Page, test } from '@playwright/test'

/**
 * Regressão do "pan preso": o Blockly 12 escuta o pointerup do arrasto no
 * DOCUMENTO do Studio (sem pointer capture). Soltar o botão com o cursor sobre
 * o <iframe> do preview fazia o pointerup nunca chegar — o gesto ficava vivo e
 * a tela seguia o mouse até um clique com o botão direito. A guarda no
 * BlocklyPanel (pointermove com buttons === 0 durante um arrasto → cancela o
 * gesto) encerra o pan na volta do mouse. Este teste reproduz o cenário real:
 * arrasta o fundo do workspace, solta o botão EM CIMA do preview e confere que
 * a tela não segue mais o mouse (e que o pan normal continua funcionando).
 */

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

function readCanvasTransform(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.querySelector('.injectionDiv .blocklyBlockCanvas')?.getAttribute('transform') ?? '',
  )
}

test.describe('Workspace do Blockly — arrasto (pan)', () => {
  test('soltar o botão sobre o preview não deixa o pan preso no mouse', async ({ page }) => {
    await createProject(page)
    const svg = page.locator('.injectionDiv .blocklySvg').first()
    await svg.waitFor({ state: 'visible' })
    await page.waitForTimeout(800)
    const box = await svg.boundingBox()
    const iframeBox = await page.locator('iframe').first().boundingBox()
    if (!box || !iframeBox) throw new Error('layout sem workspace ou sem preview')

    // Pan real: aperta no fundo do workspace, arrasta para o lado e SOLTA o
    // botão sobre o preview (o pointerup morre no documento do iframe).
    const sx = box.x + box.width * 0.7
    const sy = box.y + box.height * 0.5
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx - 60, sy, { steps: 4 })
    await page.mouse.move(sx - 140, sy, { steps: 4 })
    await page.mouse.move(iframeBox.x + iframeBox.width / 2, iframeBox.y + iframeBox.height / 2, {
      steps: 6,
    })
    await page.mouse.up()

    // De volta ao workspace SEM botão apertado: a guarda encerra o gesto no
    // primeiro movimento — a tela não pode mais seguir o mouse.
    await page.mouse.move(sx, sy, { steps: 4 })
    await page.waitForTimeout(300)
    const aposSoltar = await readCanvasTransform(page)
    await page.mouse.move(sx - 120, sy + 60, { steps: 5 })
    await page.mouse.move(sx + 60, sy - 40, { steps: 5 })
    await page.mouse.move(sx - 200, sy + 20, { steps: 5 })
    await page.waitForTimeout(300)
    const aposPassear = await readCanvasTransform(page)
    expect(aposPassear).toBe(aposSoltar)

    // Pan normal (apertar, mover e soltar DENTRO do workspace) segue vivo.
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx - 100, sy + 30, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const aposPanNormal = await readCanvasTransform(page)
    expect(aposPanNormal).not.toBe(aposPassear)
  })
})

import { expect, type Page, test } from '@playwright/test'

/**
 * Montagem sob demanda do Clássico (`src/blockly/offscreenBodies.ts`).
 *
 * Projeto grande (o dia 3 de A Chave do Farol com os eventos repetidos): o corpo dos blocos longe
 * da vista sai da página, volta quando a vista chega, e o projeto gravado e o código gerado não
 * mudam com isso. No tamanho das aulas nada sai da página.
 */

const corposFora = (page: Page) =>
  page
    .locator('[data-sz-offscreen-bodies]')
    .first()
    .getAttribute('data-sz-offscreen-bodies')
    .then((valor) => Number(valor ?? 0))

const blocosNaPagina = (page: Page) =>
  page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable').count()

const ler = (page: Page, qual: 'script' | 'blocos') =>
  page.evaluate((o) => {
    const projeto = (
      window as unknown as {
        __aula: { projeto(): { files: Record<string, string>; blocksState: unknown } }
      }
    ).__aula.projeto()
    return o === 'script' ? (projeto.files['script.js'] ?? '') : JSON.stringify(projeto.blocksState)
  }, qual)

async function abrir(page: Page, escala: number): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(
    `/aula?aula=desafio-primeiro-jogo/desafio-dia-3${escala ? `&escala=${escala}` : ''}`,
  )
  const blocos = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
  await blocos.first().waitFor({ timeout: 120_000 })
  let antes = -1
  for (let vez = 0; vez < 200; vez++) {
    const agora = await blocos.count()
    if (agora === antes) break
    antes = agora
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(1500)
}

test('no tamanho das aulas nenhum bloco sai da página', async ({ page }) => {
  await abrir(page, 0)
  expect(await page.locator('[data-sz-offscreen-bodies]').count()).toBe(0)
  expect(await page.locator('.sz-block-far').count()).toBe(0)
})

test('projeto grande: o que está longe sai da página e volta, sem mudar o projeto', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000)
  await abrir(page, 2000)
  const scriptAoAbrir = await ler(page, 'script')
  const blocosAoAbrir = await ler(page, 'blocos')
  const tiposNoProjeto = blocosAoAbrir.split('"type":"sz_').length - 1
  expect(tiposNoProjeto).toBeGreaterThan(1900)

  // Longe da vista: corpos fora da página, e muito menos blocos desenhados que os do projeto.
  await expect.poll(() => corposFora(page), { timeout: 20_000 }).toBeGreaterThan(100)
  const desenhadosNoAlto = await blocosNaPagina(page)
  expect(desenhadosNoAlto).toBeLessThan(tiposNoProjeto / 2)

  // Rolar até o fim: o que chega perto da vista volta inteiro, com o corpo.
  const canvas = page.locator('svg.blocklySvg').first()
  const caixa = await canvas.boundingBox()
  if (!caixa) throw new Error('O canvas não tem caixa na tela.')
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  const foraNoAlto = await corposFora(page)
  for (let vez = 0; vez < 40; vez++) await page.mouse.wheel(0, 3000)
  await page.waitForTimeout(1500)
  const visiveis = await page.evaluate(() => {
    const alto = window.innerHeight
    let comCorpo = 0
    for (const bloco of document.querySelectorAll(
      'svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable:not(.sz-block-far)',
    )) {
      const caixa = bloco.getBoundingClientRect()
      const naVista = caixa.bottom > 0 && caixa.top < alto && caixa.height > 0
      if (naVista && bloco.querySelector(':scope > .blocklyDraggable')) comCorpo++
    }
    return comCorpo
  })
  expect(visiveis, 'blocos na vista com o corpo montado').toBeGreaterThan(0)
  // A vista mudou de lugar: o alto, que estava montado, agora está fora.
  expect(await corposFora(page)).toBeGreaterThan(0)
  expect(foraNoAlto).toBeGreaterThan(0)

  // Rolar não é edição: o projeto e o código são os mesmos.
  expect(await ler(page, 'script')).toBe(scriptAoAbrir)
  expect(await ler(page, 'blocos')).toBe(blocosAoAbrir)

  // Editar um campo no alto chega ao código.
  for (let vez = 0; vez < 40; vez++) await page.mouse.wheel(0, -3000)
  await page.waitForTimeout(1500)
  const campo = page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyEditableField')
    .filter({ hasText: /^480$/ })
    .first()
  await campo.click()
  await page.locator('input.blocklyHtmlInput').fill('500')
  await page.keyboard.press('Enter')
  await expect.poll(() => ler(page, 'script'), { timeout: 60_000 }).not.toBe(scriptAoAbrir)

  // Desfazer com o bloco editado LONGE da vista (o corpo dele está fora da página): o código volta.
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  for (let vez = 0; vez < 40; vez++) await page.mouse.wheel(0, 3000)
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect.poll(() => ler(page, 'script'), { timeout: 60_000 }).toBe(scriptAoAbrir)
})

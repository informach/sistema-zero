import { expect, test } from '@playwright/test'

/**
 * Procurar no programa (lote 3 da missão, seção 6: "pesquisa e localização em projetos grandes",
 * 21/11/2026). Projeto de 2 mil blocos (a cauda de cada área nasce sem desenho) com um bloco
 * "marca do fim" no último evento. A busca acha pelo modelo e o "Mostrar o bloco" desenha a cauda
 * até ele. Nas aulas (70 a 80 blocos) a busca não aparece.
 */

const busca = '[data-sz-workspace-search]'

test('acha um bloco da cauda sem desenho e o mostra', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/aula?aula=desafio-primeiro-jogo/desafio-dia-3&escala=2000&marca=1')
  await page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    .first()
    .waitFor({ timeout: 120_000 })
  const marca = page.locator('svg.blocklySvg .blocklyBlockCanvas [data-id="marca-do-fim"]')
  // Na abertura, o bloco do fim não foi desenhado.
  await expect(marca).toHaveCount(0)

  // Ctrl+F na área de blocos abre a busca (o foco vai para a área com um clique nela).
  await page
    .locator('svg.blocklySvg')
    .first()
    .click({ position: { x: 40, y: 40 }, force: true })
  await page.keyboard.press('Control+f')
  const campo = page.getByRole('searchbox', { name: 'Procurar nos blocos do programa' })
  await expect(campo).toBeFocused()
  await campo.fill('marca do fim')
  await expect(page.locator(busca).getByText('1 bloco', { exact: true })).toBeVisible()
  await page
    .locator(busca)
    .getByRole('button', { name: /marca do fim/ })
    .click()

  // O "Mostrar o bloco" desenha a cauda até ele e o põe à vista.
  await expect(marca).toHaveCount(1, { timeout: 30_000 })
  await expect
    .poll(async () => {
      const caixa = await marca.boundingBox()
      return caixa !== null && caixa.y > 0 && caixa.y < 900
    })
    .toBe(true)

  // Esc fecha a busca e volta o botão.
  await campo.press('Escape')
  await expect(page.getByRole('button', { name: 'Procurar no programa' })).toBeVisible()
})

test('nas aulas (poucos blocos) a busca não aparece', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/aula?aula=desafio-primeiro-jogo/desafio-dia-3')
  await page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    .first()
    .waitFor({ timeout: 60_000 })
  await page.waitForTimeout(1000)
  await expect(page.locator(busca)).toHaveCount(0)
})

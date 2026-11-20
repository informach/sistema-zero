import { expect, type Page, test } from '@playwright/test'

/**
 * As abas Investigar e Desempenho da gaveta (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`), no navegador de verdade: a ponte entra no jogo,
 * a pausa do Jogo 2D responde, Avançar anda UM quadro, os valores chegam pelo leitor das
 * variáveis, a medida conta os quadros, e fechar a gaveta devolve o documento de sempre.
 */

function exampleCard(page: Page, name: string) {
  return page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first()
}

async function openCoinGame(page: Page) {
  await page.goto('/')
  const card = exampleCard(page, 'Pegue a moeda')
  if (!(await card.isVisible()))
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  await expect(page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas')).toBeVisible(
    {
      timeout: 20_000,
    },
  )
}

const investigar = (page: Page) => page.locator('[data-sz-devtools="investigate"]')

const frameNumber = async (page: Page) => {
  const text = await investigar(page)
    .getByText(/^Quadro [\d.]+$/)
    .first()
    .textContent()
  return Number((text ?? '').replace(/\D/g, ''))
}

const srcdoc = (page: Page) =>
  page.locator('iframe[title="Pré-visualização"]').getAttribute('srcdoc')

test.describe('as abas Investigar e Desempenho', () => {
  test.setTimeout(90_000)

  test('Investigar: pausa, avança exatamente um quadro, mostra os valores e continua', async ({
    page,
  }) => {
    await openCoinGame(page)
    expect(await srcdoc(page)).not.toContain('sz:devtools')
    await page.getByRole('tab', { name: 'Investigar' }).click()
    await page.getByRole('button', { name: 'Investigar o jogo' }).click()
    await expect(investigar(page).getByText('O jogo está rodando', { exact: true })).toBeVisible({
      timeout: 20_000,
    })
    // O leitor das variáveis entrou no script: `pontos` aparece com o valor do jogo.
    await expect(investigar(page).getByText('pontos', { exact: true })).toBeVisible({
      timeout: 10_000,
    })
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    await expect(investigar(page).getByText('O jogo está pausado', { exact: true })).toBeVisible({
      timeout: 10_000,
    })
    const antes = await frameNumber(page)
    // Pausado, o quadro não anda sozinho.
    await page.waitForTimeout(600)
    expect(await frameNumber(page)).toBe(antes)
    await page.getByRole('button', { name: 'Avançar 1 quadro' }).click()
    await expect.poll(() => frameNumber(page), { timeout: 10_000 }).toBe(antes + 1)
    await expect(investigar(page).getByText('O jogo está pausado', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(investigar(page).getByText('O jogo está rodando', { exact: true })).toBeVisible({
      timeout: 10_000,
    })
    await expect.poll(() => frameNumber(page), { timeout: 10_000 }).toBeGreaterThan(antes + 1)
    // Fechar a gaveta desliga: o jogo volta ao documento de sempre.
    await page.getByRole('button', { name: 'Fechar a gaveta' }).click()
    await expect.poll(() => srcdoc(page), { timeout: 15_000 }).not.toContain('sz:devtools')
  })

  test('Desempenho: mede os quadros do jogo e desliga ao fechar a gaveta', async ({ page }) => {
    await openCoinGame(page)
    await page.getByRole('tab', { name: 'Desempenho' }).click()
    await page.getByRole('switch', { name: 'Medir o desempenho' }).click()
    const painel = page.locator('[data-sz-devtools="performance"]')
    await expect(painel.getByText('Quadros por segundo')).toBeVisible({ timeout: 20_000 })
    await expect(painel.getByText(/Últimos \d+ segundos/)).toBeVisible()
    await expect(painel.getByText('Sem leitura')).toBeVisible()
    expect(await srcdoc(page)).toContain('sz:devtools:perf')
    await page.getByRole('button', { name: 'Fechar a gaveta' }).click()
    await expect.poll(() => srcdoc(page), { timeout: 15_000 }).not.toContain('sz:devtools')
  })
})

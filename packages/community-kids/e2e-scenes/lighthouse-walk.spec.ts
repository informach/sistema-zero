import { expect, type Page, test } from '@playwright/test'

// Manifestos reais: exploração livre separa editar regra, entrada e passagem dos quadros.
const abrir = async (page: Page, bloco: string) => {
  await page.goto(`/?course=farol&block=${bloco}&width=680`)
  await expect(page.getByRole('button', { name: 'Apertar tecla →', exact: true })).toBeVisible()
}

test('andar compara comando, tecla e soltura sem impor ordem às descobertas', async ({ page }) => {
  await abrir(page, 'experiencia-quadro')
  const hero = page.locator('[data-walk-hero]')
  await expect(hero).toHaveAttribute('data-walk-hero', '208')
  await expect(
    page.getByRole('button', { name: 'Adicionar bloco de mover', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Apertar tecla →', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar 1 quadro', exact: true }).click()
  await expect(hero).toHaveAttribute('data-walk-hero', '208')
  await page.getByRole('button', { name: 'Adicionar bloco de mover', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar 10 quadros', exact: true }).click()
  await expect(hero).toHaveAttribute('data-walk-hero', '238')
  await page.getByRole('button', { name: 'Soltar tecla →', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar 1 quadro', exact: true }).click()
  await expect(hero).toHaveAttribute('data-walk-hero', '238')
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(4)
  await page.getByRole('button', { name: 'Recomeçar experiência', exact: true }).click()
  await expect(hero).toHaveAttribute('data-walk-hero', '208')
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(0)
})

test('limite compara fora e dentro, permite pausar e testar ambas as ordens', async ({ page }) => {
  await abrir(page, 'experiencia-limite')
  await page.getByRole('button', { name: 'Apertar tecla →', exact: true }).click()
  await page.getByRole('button', { name: 'Passar quadros automaticamente', exact: true }).click()
  await expect(page.locator('[data-personagem="fora"]')).toBeVisible({ timeout: 10000 })
  const pause = page.getByRole('button', { name: 'Pausar quadros', exact: true })
  if (await pause.isVisible()) await pause.click()
  await page.getByRole('button', { name: 'Voltar ao início', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar bloco de limite', exact: true }).click()
  await page.getByRole('button', { name: 'Passar quadros automaticamente', exact: true }).click()
  await expect(page.locator('[data-personagem="dentro"]')).toHaveAttribute('data-x', '416', {
    timeout: 10000,
  })
  if (await pause.isVisible()) await pause.click()
  await page.getByText('Experimentar a ordem dos comandos', { exact: true }).click()
  await page.getByRole('button', { name: 'Limitar → mover', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar nessa ordem', exact: true }).click()
  await expect(page.locator('.edge-zoom')).toHaveAttribute('data-out', 'true')
  await page.getByRole('button', { name: 'Mover → limitar', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar nessa ordem', exact: true }).click()
  await expect(page.locator('.edge-zoom')).toHaveAttribute('data-out', 'false')
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(3)
})

for (const largura of [320, 360, 390]) {
  test(`no celular de ${largura}px, cada controle cabe no console e a página não rola de lado`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    for (const bloco of ['experiencia-quadro', 'experiencia-limite']) {
      await abrir(page, bloco)
      if (bloco === 'experiencia-limite') {
        await page.getByText('Experimentar a ordem dos comandos', { exact: true }).click()
        await expect(page.getByRole('button', { name: 'Avançar nessa ordem' })).toBeVisible()
      }
      const medida = await page.evaluate(() => {
        const caixa = document.querySelector('.sz-scene-console')?.getBoundingClientRect()
        const controles = [...document.querySelectorAll('.sz-scene-prancha button')]
          .filter((b) => b.checkVisibility())
          .map((b) => {
            const r = b.getBoundingClientRect()
            return { nome: b.textContent?.trim() ?? '', esquerda: r.left, direita: r.right }
          })
        return {
          caixa: caixa ? { esquerda: caixa.left, direita: caixa.right } : null,
          controles,
          pagina: document.documentElement.scrollWidth,
          janela: document.documentElement.clientWidth,
        }
      })
      const caixa = medida.caixa
      if (!caixa) throw new Error(`${bloco}: sem o console`)
      expect(medida.controles.map((c) => c.nome)).toContain('Apertar tecla →')
      const fora = medida.controles
        .filter((c) => c.esquerda < caixa.esquerda - 0.5 || c.direita > caixa.direita + 0.5)
        .map((c) => `${c.nome} (${Math.round(c.esquerda)}..${Math.round(c.direita)})`)
      expect({ bloco, largura, fora }).toEqual({ bloco, largura, fora: [] })
      expect({ bloco, largura, pagina: medida.pagina }).toEqual({
        bloco,
        largura,
        pagina: medida.janela,
      })
    }
  })
}

import { expect, type Page, test } from '@playwright/test'

// Manifestos reais. O quadro é a câmera lenta (01/11/2026): só a ideia, sem blocos; o limite segue
// separando editar a regra, a entrada e a passagem dos quadros.
const SETA_DO_QUADRO = 'Segure a seta ▶'
const abrir = async (page: Page, bloco: string) => {
  await page.goto(`/?course=farol&block=${bloco}&width=680`)
  const seta = bloco === 'experiencia-quadro' ? SETA_DO_QUADRO : 'Apertar tecla →'
  await expect(page.getByRole('button', { name: seta, exact: true })).toBeVisible()
}

test('a câmera lenta mostra os passinhos, a parada e a caminhada de verdade, sem blocos', async ({
  page,
}) => {
  await abrir(page, 'experiencia-quadro')
  const hero = page.locator('[data-walk-hero]')
  await expect(hero).toHaveAttribute('data-walk-hero', '208')
  await expect(page.getByText(/bloco|teclado de teste/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Câmera lenta', exact: true }).click()
  // Segurar de verdade: o mouse fica apertado no botão enquanto os quadros passam devagar.
  await page.getByRole('button', { name: SETA_DO_QUADRO, exact: true }).hover()
  await page.mouse.down()
  const x = async () => Number(await hero.getAttribute('data-walk-hero'))
  await expect.poll(x, { timeout: 5000 }).toBeGreaterThan(211)
  await page.mouse.up()
  // Solta: os quadros seguem passando, e o personagem fica onde está.
  await expect(page.locator('.slow-tira-quadro[data-andou="false"]').first()).toBeVisible({
    timeout: 5000,
  })
  const parado = await x()
  await page.waitForTimeout(1200)
  expect(await x()).toBe(parado)
  await page.getByRole('button', { name: 'Velocidade de verdade', exact: true }).click()
  // A seta do teclado também segura.
  await page.keyboard.down('ArrowRight')
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(3, {
    timeout: 5000,
  })
  await page.keyboard.up('ArrowRight')
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await page.getByRole('button', { name: 'Recomeçar experiência', exact: true }).click()
  await expect(hero).toHaveAttribute('data-walk-hero', '208')
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(0)
})

test('segurar a seta com o jogo pausado põe os quadros para passar em câmera lenta', async ({
  page,
}) => {
  await abrir(page, 'experiencia-quadro')
  const hero = page.locator('[data-walk-hero]')
  await page.getByRole('button', { name: SETA_DO_QUADRO, exact: true }).hover()
  await page.mouse.down()
  await expect
    .poll(async () => Number(await hero.getAttribute('data-walk-hero')), { timeout: 5000 })
    .toBeGreaterThan(208)
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Câmera lenta', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
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
      expect(medida.controles.map((c) => c.nome)).toContain(
        bloco === 'experiencia-quadro' ? SETA_DO_QUADRO : 'Apertar tecla →',
      )
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

test('o comando de ordem cabe no painel estreito também com texto ampliado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await abrir(page, 'experiencia-limite')
  await page.getByText('Experimentar a ordem dos comandos', { exact: true }).click()
  const button = page.getByRole('button', { name: 'Avançar nessa ordem', exact: true })
  await button.evaluate((element) => {
    element.style.fontSize = '20px'
  })
  const bounds = await button.evaluate((element) => {
    const parent = element.parentElement
    if (!parent) throw new Error('Painel de ordem ausente')
    const panel = parent.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    return {
      inside: rect.left >= panel.left && rect.right <= panel.right,
      clipped: element.scrollWidth > element.clientWidth,
    }
  })
  expect(bounds).toEqual({ inside: true, clipped: false })
  await button.click()
  await expect(page.locator('.edge-zoom')).toHaveAttribute('data-out', 'false')
})

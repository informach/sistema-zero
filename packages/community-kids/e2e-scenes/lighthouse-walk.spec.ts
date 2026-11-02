import { expect, type Page, test } from '@playwright/test'

// Manifestos reais. As duas experiências do Dia 1 trabalham só a ideia (01/11/2026): a câmera lenta
// (quadro) e a beirada da tela (limite), sem blocos nem ordem dos blocos.
const SETA_DO_QUADRO = 'Segure a seta ▶'
const abrir = async (page: Page, bloco: string) => {
  await page.goto(`/?course=farol&block=${bloco}&width=680`)
  await expect(page.getByRole('button', { name: SETA_DO_QUADRO, exact: true })).toBeVisible()
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

test('a beirada: sem o limite ele sai, com o limite ligado ele volta e fica, sem blocos', async ({
  page,
}) => {
  await abrir(page, 'experiencia-limite')
  await expect(page.getByText(/bloco|teclado de teste|ordem dos/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Velocidade de verdade', exact: true }).click()
  await page.getByRole('button', { name: SETA_DO_QUADRO, exact: true }).hover()
  await page.mouse.down()
  await expect(page.locator('[data-personagem="fora"]')).toBeVisible({ timeout: 10000 })
  await page.mouse.up()
  // Observe a volta na câmera lenta: a tira guarda só seis quadros. Ligando o limite
  // ainda a 30 fps e depois mudando o ritmo, a volta já podia ter saído da tira.
  await page.getByRole('button', { name: 'Câmera lenta', exact: true }).click()
  await page.getByRole('button', { name: 'Ligar o limite da tela', exact: true }).click()
  await expect(page.getByText('↩ voltou').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('[data-personagem="dentro"]')).toHaveAttribute('data-x', '416', {
    timeout: 10000,
  })
  await page.getByRole('button', { name: SETA_DO_QUADRO, exact: true }).hover()
  await page.mouse.down()
  // Segurando na beirada em câmera lenta: cada quadro passa e volta.
  await expect(page.locator('.sz-discovery-discoveries li[data-done="true"]')).toHaveCount(3, {
    timeout: 5000,
  })
  await expect(page.getByText(/Neste quadro: o passinho ia levar/)).toBeVisible()
  await expect(page.getByText('✋ segurou').first()).toBeVisible()
  await page.mouse.up()
})

for (const largura of [320, 360, 390]) {
  test(`no celular de ${largura}px, cada controle cabe no console e a página não rola de lado`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    for (const bloco of ['experiencia-quadro', 'experiencia-limite']) {
      await abrir(page, bloco)
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
      expect(medida.controles.map((c) => c.nome)).toContain(SETA_DO_QUADRO)
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

import { expect, type Page, test } from '@playwright/test'

// Manifestos reais. As duas experiências do Dia 1 trabalham só a ideia (01/11/2026): a câmera lenta
// (quadro) e a beirada da tela (limite), sem blocos nem ordem dos blocos. Desde 08/11/2026 na
// moldura nova: a tela do jogo com o personagem em x 21, a tecla de seta (→ ou D), Devagar e
// Rápido, Pausar e Começo, e a cerca da beirada.
const SETA = 'Seta para a direita: segure para o personagem andar'
const abrir = async (page: Page, bloco: string) => {
  await page.goto(`/?course=farol&block=${bloco}&width=680`)
  await expect(page.getByRole('button', { name: SETA, exact: true })).toBeVisible()
}
const feitas = (page: Page) => page.locator('.sz-discovery-cartao[data-feito="true"]')

test('a câmera lenta mostra os passinhos, a parada e a caminhada de verdade, sem blocos', async ({
  page,
}) => {
  await abrir(page, 'experiencia-quadro')
  const hero = page.locator('[data-walk-hero]')
  await expect(hero).toHaveAttribute('data-walk-hero', '21')
  await expect(page.getByText(/bloco|teclado de teste/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Devagar/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // Segurar de verdade: o mouse fica apertado na tecla enquanto os quadros passam devagar.
  await page.getByRole('button', { name: SETA, exact: true }).hover()
  await page.mouse.down()
  const x = async () => Number(await hero.getAttribute('data-walk-hero'))
  await expect.poll(x, { timeout: 5000 }).toBeGreaterThan(24)
  await page.mouse.up()
  // Solta: os quadros seguem passando, e o personagem fica onde está.
  await expect(page.locator('.slow-tira-quadro[data-andou="false"]').first()).toBeVisible({
    timeout: 5000,
  })
  const parado = await x()
  await page.waitForTimeout(1200)
  expect(await x()).toBe(parado)
  await page.getByRole('button', { name: /Rápido/ }).click()
  // A seta do teclado também segura (e o D).
  await page.keyboard.down('ArrowRight')
  await expect(feitas(page)).toHaveCount(3, { timeout: 5000 })
  await page.keyboard.up('ArrowRight')
  await expect(page.getByText('A ideia que você descobriu')).toBeVisible()
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  // Recomeçar pede confirmação e apaga as descobertas.
  await page.getByRole('button', { name: 'Recomeçar experiência', exact: true }).click()
  await page
    .getByRole('group', { name: 'Apagar as descobertas?' })
    .getByRole('button', { name: 'Sim' })
    .click()
  await expect(hero).toHaveAttribute('data-walk-hero', '21')
  await expect(feitas(page)).toHaveCount(0)
})

test('segurar a tecla D com o jogo pausado põe os quadros para passar no Devagar', async ({
  page,
}) => {
  await abrir(page, 'experiencia-quadro')
  const hero = page.locator('[data-walk-hero]')
  await page.locator('.sz-discovery-moldura').scrollIntoViewIfNeeded()
  await page.keyboard.down('KeyD')
  await expect
    .poll(async () => Number(await hero.getAttribute('data-walk-hero')), { timeout: 5000 })
    .toBeGreaterThan(21)
  await expect(page.getByRole('button', { name: SETA, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.keyboard.up('KeyD')
})

test('a beirada: sem o limite ele sai, com a cerca ligada ele volta e fica, sem blocos', async ({
  page,
}) => {
  await abrir(page, 'experiencia-limite')
  await expect(page.getByText(/bloco|teclado de teste|ordem dos/i)).toHaveCount(0)
  // A beirada abre no Rápido.
  await expect(page.getByRole('button', { name: /Rápido/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: SETA, exact: true }).hover()
  await page.mouse.down()
  await expect(page.locator('[data-personagem="fora"]')).toBeVisible({ timeout: 15000 })
  await page.mouse.up()
  const cerca = page.getByRole('switch')
  await expect(cerca).toHaveAttribute('data-pulsar', 'true')
  // Ligar a cerca com ele fora: no Devagar, o próximo quadro o traz de volta.
  await cerca.click()
  await expect(cerca).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('↩ voltou').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('[data-personagem="dentro"]')).toHaveAttribute('data-x', '416', {
    timeout: 10000,
  })
  await page.getByRole('button', { name: SETA, exact: true }).hover()
  await page.mouse.down()
  // Segurando na beirada no Devagar: cada quadro passa e o jogo segura.
  await expect(feitas(page)).toHaveCount(3, { timeout: 8000 })
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
        const controles = [...document.querySelectorAll('.sz-discovery-moldura button')]
          .filter((b) => b.checkVisibility())
          .map((b) => {
            const r = b.getBoundingClientRect()
            return {
              nome: b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '',
              esquerda: r.left,
              direita: r.right,
            }
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
        'Seta para a direita: segure para o personagem andar',
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

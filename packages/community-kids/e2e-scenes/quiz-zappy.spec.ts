import { expect, type Page, test } from '@playwright/test'

import { animationPixels } from './animation-pixels'

async function desenhoDoZappy(page: Page, index: number) {
  const drawing = page.locator('main span[role="img"] > span > svg').nth(index)
  await drawing.scrollIntoViewIfNeeded()
  const frame = await animationPixels(drawing)
  expect(frame.count).toBeGreaterThan(200)
  return { esquerda: frame.left, direita: frame.right, centro: frame.center, largura: frame.width }
}

for (const [width, escala] of [
  [390, 2],
  [1280, 1],
  [1280, 2],
] as const) {
  test(`o Zappy da pergunta do quiz sai inteiro e no centro, em ${width}px ${escala}x`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: escala,
    })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/quiz-zappy')
    await page.getByRole('button', { name: 'Começar!' }).click()
    await expect(page.getByText('Pergunta 1 de 3')).toBeVisible()
    // 0 = o Zappy da fala da parte; 1 = o Zappy da pergunta.
    await expect(page.locator('main span[role="img"] > span > svg')).toHaveCount(2)
    const fala = await desenhoDoZappy(page, 0)
    const pergunta = await desenhoDoZappy(page, 1)
    for (const desenho of [fala, pergunta]) {
      expect(desenho.esquerda).toBeGreaterThan(0.02)
      expect(desenho.direita).toBeLessThan(0.98)
      expect(Math.abs(desenho.centro - 0.5)).toBeLessThan(0.08)
    }
    // SVG permanece vetorial; a captura usa a densidade real da tela.
    expect(pergunta.largura).toBe(Math.round(width < 640 ? 64 * escala : 80 * escala))
    expect(errors).toEqual([])
    await context.close()
  })
}

test('o Cadê abre sua previsão real sem depender da introdução do quiz clássico', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/quiz-zappy?flow=prediction')
  await expect(page.getByText('Vou tocar nas pedras. O que a regra deve fazer?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Começar!' })).toHaveCount(0)
  const reveal = page.getByRole('button', { name: 'Ver o que acontece', exact: true })
  await expect(reveal).toBeDisabled()
  await page.getByRole('radio').first().click()
  await expect(reveal).toBeEnabled()
  expect(errors).toEqual([])
})

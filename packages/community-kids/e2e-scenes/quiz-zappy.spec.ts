import { expect, type Page, test } from '@playwright/test'

/**
 * O Zappy da pergunta do quiz (07/10/2026). Num navegador de captura do staging ele apareceu
 * desenhado fora do centro, com metade cortada na borda do quadrado, enquanto o Zappy da fala logo
 * acima saía inteiro. O ensaio monta a parte do quiz como a página de fase (fala, vídeo e quiz pelo
 * `KidsLessonBlocks`) e mede o DESENHO, e não só a caixa: onde os pixels do Zappy caem dentro do
 * canvas.
 */
async function desenhoDoZappy(page: Page, index: number) {
  const canvas = page.locator('main canvas').nth(index)
  await canvas.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      canvas.evaluate(
        (el: HTMLCanvasElement) =>
          new Promise<number>((resolve) =>
            requestAnimationFrame(() => {
              const ctx = el.getContext('2d')
              if (!ctx) return resolve(0)
              const { data } = ctx.getImageData(0, 0, el.width, el.height)
              let n = 0
              for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 32) n++
              resolve(n)
            }),
          ),
      ),
    )
    .toBeGreaterThan(200)
  return canvas.evaluate(
    (el: HTMLCanvasElement) =>
      new Promise<{ esquerda: number; direita: number; centro: number; largura: number }>(
        (resolve) =>
          requestAnimationFrame(() => {
            const ctx = el.getContext('2d')!
            const { data } = ctx.getImageData(0, 0, el.width, el.height)
            let min = el.width
            let max = -1
            let soma = 0
            let n = 0
            for (let y = 0; y < el.height; y++)
              for (let x = 0; x < el.width; x++)
                if ((data[(y * el.width + x) * 4 + 3] ?? 0) > 32) {
                  min = Math.min(min, x)
                  max = Math.max(max, x)
                  soma += x
                  n++
                }
            resolve({
              esquerda: min / el.width,
              direita: (max + 1) / el.width,
              centro: soma / n / el.width,
              largura: el.width,
            })
          }),
      ),
  )
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
    await expect(page.locator('main canvas')).toHaveCount(2)
    const fala = await desenhoDoZappy(page, 0)
    const pergunta = await desenhoDoZappy(page, 1)
    for (const desenho of [fala, pergunta]) {
      expect(desenho.esquerda).toBeGreaterThan(0.02)
      expect(desenho.direita).toBeLessThan(0.98)
      expect(Math.abs(desenho.centro - 0.5)).toBeLessThan(0.08)
    }
    // O canvas desenha na densidade da tela: sem isso o Zappy sai borrado.
    expect(pergunta.largura).toBe(Math.round(width < 640 ? 64 * escala : 80 * escala))
    expect(errors).toEqual([])
    await context.close()
  })
}

import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`a criança encontra os três personagens tocando o jogo real em ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/project-play')
    const restart = page.getByRole('button', { name: 'Jogar de novo' })
    await expect(restart).toBeEnabled()
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Aguardando descoberta',
    )

    const canvas = page
      .frameLocator('iframe[title="Cadê Todo Mundo? — jogo pronto"]')
      .locator('canvas')
    await expect(canvas).toBeVisible()
    const clickTarget = async (x: number, y: number) => {
      const size = await canvas.evaluate((element) => ({
        width: element.clientWidth,
        height: element.clientHeight,
      }))
      await canvas.click({ position: { x: (x / 640) * size.width, y: (y / 360) * size.height } })
    }

    await clickTarget(137, 224)
    await clickTarget(310, 226)
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Aguardando descoberta',
    )
    await clickTarget(483, 210)
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Jogo concluído',
    )

    await page.getByRole('button', { name: 'Ampliar jogo' }).click()
    await expect(page.getByRole('dialog', { name: 'Jogo ampliado' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Jogo ampliado' })).toHaveCount(0)
    await restart.click()
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Jogo concluído',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

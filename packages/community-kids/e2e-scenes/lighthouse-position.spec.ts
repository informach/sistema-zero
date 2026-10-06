import { expect, type Page, test } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/?course=farol&block=experiencia-posicao&width=680')
  await expect(page.getByRole('textbox', { name: 'Digitar Posição horizontal x' })).toBeVisible()
}

test('teclado muda um eixo por vez, guarda as descobertas e Recomeçar restaura a posição', async ({
  page,
}, info) => {
  await open(page)
  const key = page.locator('[data-chave]')
  const x = page.getByRole('textbox', { name: 'Digitar Posição horizontal x' })
  const y = page.getByRole('textbox', { name: 'Digitar Posição vertical y' })
  await expect(key).toHaveAttribute('x', '211')
  await expect(key).toHaveAttribute('y', '53')
  await x.fill('160')
  await x.press('Enter')
  await expect(key).toHaveAttribute('x', '160')
  await expect(key).toHaveAttribute('y', '53')
  await expect(y).toHaveValue('53')
  await y.fill('250')
  await y.press('Enter')
  await expect(key).toHaveAttribute('x', '160')
  await expect(key).toHaveAttribute('y', '250')
  await expect(key).toHaveAttribute('width', '32')
  await expect(key).toHaveAttribute('height', '32')
  await expect(page.locator('[data-posicao-anterior]')).toHaveCount(1)
  await page.screenshot({ path: info.outputPath('posicao-chave-desktop.png'), fullPage: true })
  const restart = page.getByRole('button', { name: 'Recomeçar', exact: true })
  await expect(restart).toHaveCount(1)
  await restart.click()
  await expect(x).toHaveValue('211')
  await expect(y).toHaveValue('53')
  await expect(key).toHaveAttribute('x', '211')
  await expect(key).toHaveAttribute('y', '53')
  await expect(page.locator('[data-posicao-anterior]')).toHaveCount(0)
  // A seta do deslizante também chega ao motor, com o gesto terminado no keyup.
  await page.getByRole('slider', { name: 'Posição horizontal x' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(key).toHaveAttribute('x', '212')
  await expect(y).toHaveValue('53')
})

for (const width of [320, 390]) {
  test(`a ${width}px os campos cabem e os botões movem a chave sem alterar o outro eixo`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await open(page)
    await page.getByRole('button', { name: 'Diminuir Posição horizontal x em 20' }).click()
    await expect(page.locator('[data-chave]')).toHaveAttribute('x', '191')
    await expect(page.locator('[data-chave]')).toHaveAttribute('y', '53')
    await page.getByRole('button', { name: 'Aumentar Posição vertical y em 20' }).click()
    await expect(page.locator('[data-chave]')).toHaveAttribute('x', '191')
    await expect(page.locator('[data-chave]')).toHaveAttribute('y', '73')
    const measurement = await page.evaluate(() => {
      const container = document.querySelector('.sz-scene-console')?.getBoundingClientRect()
      if (!container) throw new Error('Console ausente')
      const outside = [
        ...document.querySelectorAll('.sz-scene-prancha button, .sz-scene-prancha input'),
      ]
        .filter((element) => {
          const box = element.getBoundingClientRect()
          return box.left < container.left - 0.5 || box.right > container.right + 0.5
        })
        .map((element) => element.getAttribute('aria-label') ?? element.textContent)
      const clippedLabels = [...document.querySelectorAll('.sz-scene-prancha label')]
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent)
      return {
        outside,
        clippedLabels,
        page: document.documentElement.scrollWidth,
        window: innerWidth,
      }
    })
    expect(measurement).toEqual({ outside: [], clippedLabels: [], page: width, window: width })
    await page.screenshot({ path: info.outputPath(`posicao-chave-${width}.png`), fullPage: true })
  })
}

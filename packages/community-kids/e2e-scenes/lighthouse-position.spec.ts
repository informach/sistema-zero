import { expect, type Page, test } from '@playwright/test'

// A posição da chave na moldura nova (08/11/2026): os dois números com − e +, o palpite do y antes
// do primeiro "y +", o teclado (setas, WASD, + e −) e o aviso na borda.
const open = async (page: Page) => {
  await page.goto('/?course=farol&block=experiencia-posicao&width=680')
  await expect(page.getByRole('button', { name: 'x menos 60' })).toBeVisible()
}

test('os botões mudam um número por vez, o y pede o palpite e Recomeçar volta ao começo', async ({
  page,
}, info) => {
  await open(page)
  const key = page.locator('[data-chave]')
  await expect(key).toHaveAttribute('x', '211')
  await expect(key).toHaveAttribute('y', '53')
  await page.getByRole('button', { name: 'x menos 60' }).click()
  await expect(key).toHaveAttribute('x', '151')
  await expect(key).toHaveAttribute('y', '53')
  // O primeiro "y +" pergunta antes: sobe ou desce?
  await page.getByRole('button', { name: 'y mais 40' }).click()
  const palpite = page.getByRole('group', { name: 'Seu palpite' })
  await expect(palpite).toBeVisible()
  await expect(key).toHaveAttribute('y', '53')
  await palpite.getByRole('button', { name: /sobe/ }).click()
  await expect(key).toHaveAttribute('y', '93')
  await expect(key).toHaveAttribute('x', '151')
  await expect(page.getByText('Você achou que subia, mas desceu!').last()).toBeVisible()
  await page.screenshot({ path: info.outputPath('posicao-chave-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Recomeçar experiência', exact: true }).click()
  await page
    .getByRole('group', { name: 'Apagar as descobertas?' })
    .getByRole('button', { name: 'Sim' })
    .click()
  await expect(key).toHaveAttribute('x', '211')
  await expect(key).toHaveAttribute('y', '53')
})

test('o teclado: setas e WASD movem, + e − mudam o número em destaque, e a borda avisa', async ({
  page,
}) => {
  await open(page)
  const key = page.locator('[data-chave]')
  await page.locator('.sz-discovery-moldura').scrollIntoViewIfNeeded()
  await page.keyboard.press('ArrowRight')
  await expect(key).toHaveAttribute('x', '271')
  await page.keyboard.press('KeyA')
  await expect(key).toHaveAttribute('x', '211')
  await page.keyboard.press('+')
  await expect(key).toHaveAttribute('x', '271')
  // O y começa em 53: subir uma vez chega a 13, e a segunda (que passaria do 0) avisa a borda sem
  // mexer: a chave fica na grade dos passos, e o alvo do desafio continua alcançável.
  await page.keyboard.press('KeyW')
  await expect(key).toHaveAttribute('y', '13')
  await page.keyboard.press('KeyW')
  await expect(page.getByRole('status').filter({ hasText: 'borda da tela' })).toBeVisible()
  await expect(key).toHaveAttribute('y', '13')
  // E o alvo (271, 253) se alcança só com os passos: x + 1 (271) e y + 6 (253).
  await page.getByRole('button', { name: 'Começo' }).click()
  await expect(key).toHaveAttribute('y', '53')
})

for (const width of [320, 390]) {
  test(`a ${width}px os números cabem e os botões movem a chave sem alterar o outro eixo`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await open(page)
    await page.getByRole('button', { name: 'x menos 60' }).click()
    await expect(page.locator('[data-chave]')).toHaveAttribute('x', '151')
    await expect(page.locator('[data-chave]')).toHaveAttribute('y', '53')
    await page.getByRole('button', { name: 'y menos 40' }).click()
    await expect(page.locator('[data-chave]')).toHaveAttribute('x', '151')
    await expect(page.locator('[data-chave]')).toHaveAttribute('y', '13')
    const measurement = await page.evaluate(() => {
      const container = document.querySelector('.sz-scene-console')?.getBoundingClientRect()
      if (!container) throw new Error('Console ausente')
      const outside = [...document.querySelectorAll('.sz-discovery-moldura button')]
        .filter((element) => element.checkVisibility())
        .filter((element) => {
          const box = element.getBoundingClientRect()
          return box.left < container.left - 0.5 || box.right > container.right + 0.5
        })
        .map((element) => element.getAttribute('aria-label') ?? element.textContent)
      return { outside, page: document.documentElement.scrollWidth, window: innerWidth }
    })
    expect(measurement).toEqual({ outside: [], page: width, window: width })
    await page.screenshot({ path: info.outputPath(`posicao-chave-${width}.png`), fullPage: true })
  })
}

import { expect, test } from '@playwright/test'

test('define o jogo, mostra o escopo completo e só inicia depois do aceite', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?vazio=1')
  await page
    .getByLabel('Sua ideia ou mudança', { exact: true })
    .fill('Quero um jogo da memória com doze cartas, seis pares e um botão para jogar de novo.')
  await page.getByRole('button', { name: 'Organizar meu jogo', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Confira este caminho', exact: true }),
  ).toBeVisible()
  const path = page.getByRole('region', { name: 'Meu caminho', exact: true })
  await expect(path.locator('li')).toHaveCount(9)
  await expect(page.getByRole('button', { name: 'Continuar no Estúdio', exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: 'Este é o meu jogo', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Continuar no Estúdio', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Confira este caminho', exact: true }),
  ).toHaveCount(0)
  await expect(path.locator('li')).toHaveCount(9)
  await page.getByRole('button', { name: 'Continuar no Estúdio', exact: true }).click()
  await expect(
    page.getByText('A missão abre no Estúdio no aplicativo completo.', { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const teamBounds = await page
    .getByRole('button', { name: 'Equipe · 1', exact: true })
    .boundingBox()
  expect(teamBounds).not.toBeNull()
  expect((teamBounds?.x ?? 0) + (teamBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  )
  await page.screenshot({ path: '.cache/pensa-accepted-desktop.png', fullPage: true })
})

test('a equipe mantém o foco e exibe o código depois de gerar o convite', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Continuar Memória dos animais', exact: true }).click()
  const team = page.getByRole('button', { name: 'Equipe · 1', exact: true })
  await team.click()
  const dialog = page.getByRole('dialog', { name: 'Equipe de Memória dos animais', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Gerar código', exact: true }).click()
  await expect(dialog.getByLabel('Código do jogo', { exact: true })).toHaveText('ZAP-ABC123')
  await dialog.getByRole('button', { name: 'Fechar equipe', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(team).toBeFocused()
})

test('o plano completo cabe no celular e mantém o objetivo e as conferências', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Continuar Memória dos animais', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'O que vou criar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Como conferir', exact: true })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Meu caminho', exact: true }).locator('li'),
  ).toHaveCount(9)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: '.cache/pensa-mobile.png', fullPage: true })
})

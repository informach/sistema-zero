import { expect, test } from '@playwright/test'

const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth

test('define o jogo, mostra o plano completo e só inicia depois do aceite', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?vazio=1&shell=0')
  await page
    .getByLabel('Sua ideia', { exact: true })
    .fill('Quero um jogo da memória com doze cartas, seis pares e um botão para jogar de novo.')
  await page.getByRole('button', { name: 'Organizar meu jogo', exact: true }).click()
  await expect(page.getByRole('heading', { name: /^Este é o plano do / })).toBeVisible()
  const map = page.getByRole('region', { name: 'O mapa das missões', exact: true })
  await expect(map.getByRole('button', { name: /^Missão \d+, / })).toHaveCount(9)
  await expect(page.getByRole('button', { name: 'Continuar no Estúdio', exact: true })).toHaveCount(
    0,
  )
  await map.getByRole('button', { name: /^Missão 2, / }).click()
  const preview = page.getByRole('dialog')
  await expect(preview.getByText('As missões abrem depois que você aceitar o plano.')).toBeVisible()
  await preview.getByRole('button', { name: 'Fechar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Este é o meu jogo', exact: true }).click()
  const next = page.getByRole('button', { name: 'Continuar no Estúdio', exact: true })
  await expect(next).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Este é o plano do / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Missão \d+, / })).toHaveCount(9)
  await next.click()
  await expect(
    page.getByText('A missão abre no Estúdio no aplicativo completo.', { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(noHorizontalScroll)).toBe(true)
  const teamBounds = await page.getByRole('button', { name: /^Equipe, / }).boundingBox()
  expect(teamBounds).not.toBeNull()
  expect((teamBounds?.x ?? 0) + (teamBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  )
  await page.screenshot({ path: '.cache/pensa-accepted-desktop.png', fullPage: true })
})

test('a equipe mantém o foco e troca o código do convite', async ({ page }) => {
  await page.goto('/?cena=projeto&shell=0')
  const team = page.getByRole('button', { name: /^Equipe, 2 pessoas$/ })
  await team.click()
  const dialog = page.getByRole('dialog', { name: 'Equipe do Memória dos animais', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Código do jogo', { exact: true })).toHaveText('ZAP-ABC123')
  await dialog.getByRole('button', { name: 'Desligar código', exact: true }).click()
  await expect(dialog.getByLabel('Código do jogo', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Gerar código', exact: true }).click()
  await expect(dialog.getByLabel('Código do jogo', { exact: true })).toHaveText('ZAP-ABC123')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(team).toBeFocused()
})

test('o menu de três pontos cuida do jogo pelo teclado', async ({ page }) => {
  await page.goto('/?cena=projeto&shell=0')
  const dots = page.getByRole('button', { name: 'Cuidar do jogo', exact: true })
  await dots.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Cuidar do jogo' })
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: /Versões guardadas/ })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(dots).toBeFocused()
})

test('no celular o projeto vira abas e o plano cabe sem rolar de lado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?cena=projeto')
  await expect(page.getByRole('tab', { name: 'Plano' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Deixe escolher duas cartas' })).toBeVisible()
  await page.getByRole('button', { name: /^Missão 5, / }).click()
  const mission = page.getByRole('dialog', { name: 'Mantenha os pares abertos' })
  await expect(mission.getByRole('heading', { name: 'O que você vai criar' })).toBeVisible()
  await expect(mission.getByRole('heading', { name: 'Como conferir' })).toBeVisible()
  await mission.getByRole('button', { name: 'Fechar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Preciso de ajuda', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Conversa' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('Sua dúvida')).toBeFocused()
  await page.getByRole('tab', { name: 'Carta do jogo' }).click()
  await expect(page.getByText('Como se joga', { exact: true })).toBeVisible()
  expect(await page.evaluate(noHorizontalScroll)).toBe(true)
  await page.screenshot({ path: '.cache/pensa-mobile.png', fullPage: true })
})

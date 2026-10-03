import { expect, test } from '@playwright/test'

for (const input of ['keyboard', 'pointer'] as const) {
  test(`participação exige entrada real no jogo clássico: ${input}`, async ({ page }) => {
    await page.goto('/project-play?completion=participation')
    const outcome = page.getByRole('status', { name: 'Resultado do jogo' })
    const restart = page.getByRole('button', { name: 'Jogar de novo' })
    await expect(restart).toBeEnabled()
    await page.getByRole('button', { name: 'Ampliar jogo' }).click()
    await page.keyboard.press('Escape')
    await restart.click()
    await expect(restart).toBeEnabled()
    const game = page.frameLocator('iframe[title="Jogo clássico de participação"]')
    await expect(game.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible()
    await expect(outcome).toHaveText('Aguardando descoberta')

    if (input === 'keyboard')
      await game.getByRole('button', { name: 'Jogar', exact: true }).press('ArrowRight')
    else await game.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect(outcome).toHaveText('Jogo concluído')
    await restart.click()
    await expect(restart).toBeEnabled()
    await expect(outcome).toHaveText('Jogo concluído')
  })
}

test('as setas do jogo não rolam a página da aula no modo normal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await page.goto('/project-play?completion=participation')
  await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeEnabled()
  const game = page.frameLocator('iframe[title="Jogo clássico de participação"]')
  const jogar = game.getByRole('button', { name: 'Jogar', exact: true })
  await expect(jogar).toBeVisible()
  // A aula de verdade é bem mais alta que a janela; o ensaio não, então a página ganha altura.
  await page.evaluate(() => {
    document.body.style.minHeight = '400vh'
    window.scrollTo(0, 120)
  })

  // Anti-vácuo: com o foco na PÁGINA, a seta rola (o teclado rola neste navegador).
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  const antes = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(antes)

  await page.evaluate(() => window.scrollTo(0, 120))
  // Dar o foco traz o botão para a vista e pode rolar a página uns pixels: mede DEPOIS dele.
  await jogar.focus()
  await page.waitForTimeout(200)
  const comFoco = await page.evaluate(() => window.scrollY)
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'PageDown', 'Space', 'End'])
    await page.keyboard.press(key)
  // Dá tempo de uma rolagem suave terminar antes de medir.
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.scrollY)).toBe(comFoco)
})

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`a criança encontra os três personagens tocando o jogo real em ${viewport.width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/project-play')
    const restart = page.getByRole('button', { name: 'Jogar de novo' })
    await expect(restart).toBeEnabled()
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Aguardando descoberta',
    )

    const canvas = page
      .frameLocator('iframe[title="Cadê Todo Mundo? (jogo pronto)"]')
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
    const expanded = page.getByRole('dialog', { name: 'Jogo ampliado' })
    await expect(expanded).toBeVisible()
    const bounds = await expanded.boundingBox()
    expect(bounds).toEqual({ x: 0, y: 0, ...viewport })
    expect(
      await expanded.evaluate((element) =>
        element.contains(document.elementFromPoint(1, innerHeight - 1)),
      ),
    ).toBe(true)
    // O jogo encaixa SEM rolagem (com a tela ampliada rolando, as setas do jogo rolavam junto),
    // na proporção do palco, e as ações ficam na linha do título quando cabem.
    const encaixe = await expanded.evaluate((el) => {
      const card = el.querySelector<HTMLElement>('.sz-project-play-card')
      const palco = el.querySelector<HTMLElement>('.sz-project-play-stage')
      const titulo = el.querySelector<HTMLElement>('.sz-project-play-heading')
      const acoes = el.querySelector<HTMLElement>('.sz-project-play-actions')
      if (!card || !palco || !titulo || !acoes) throw new Error('Peças do jogo ampliado ausentes')
      const box = palco.getBoundingClientRect()
      return {
        rola: el.scrollHeight > el.clientHeight + 1 || card.scrollHeight > card.clientHeight + 1,
        proporcao: box.width / box.height,
        cabe: box.bottom <= innerHeight,
        mesmaLinha: acoes.getBoundingClientRect().top < titulo.getBoundingClientRect().bottom,
      }
    })
    expect(encaixe.rola).toBe(false)
    expect(encaixe.proporcao).toBeCloseTo(640 / 360, 1)
    expect(encaixe.cabe).toBe(true)
    if (viewport.width >= 640) expect(encaixe.mesmaLinha).toBe(true)
    await page.screenshot({ path: info.outputPath('jogo-ampliado.png') })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Jogo ampliado' })).toHaveCount(0)
    await restart.click()
    await expect(page.getByRole('status', { name: 'Resultado do jogo' })).toHaveText(
      'Jogo concluído',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

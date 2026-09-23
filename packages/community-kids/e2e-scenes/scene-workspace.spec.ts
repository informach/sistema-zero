import { expect, type Page, test } from '@playwright/test'

const chip = (page: Page) =>
  page
    .getByRole('button', { name: /Mover a nave um pouquinho/ })
    .filter({ has: page.locator('.sz-once-card-label') })
const expand = (page: Page) => page.getByRole('button', { name: 'Ampliar experiência' })
const close = (page: Page) => page.getByRole('button', { name: 'Voltar à aula' })

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const button of await page.locator('.sz-once-card').all()) {
    expect(
      await button.evaluate((el) => {
        const area = el.closest('[data-once-area]')?.getBoundingClientRect()
        const box = el.getBoundingClientRect()
        return (
          !!area &&
          box.left >= area.left &&
          box.right <= area.right &&
          el.scrollWidth <= el.clientWidth
        )
      }),
    ).toBe(true)
    expect(
      await page.locator('.sz-scene-workspace-header').evaluate((el) => {
        const heading = el.firstElementChild!.getBoundingClientRect()
        const button = el.lastElementChild!.getBoundingClientRect()
        const title = el.firstElementChild as HTMLElement
        return (
          title.scrollWidth <= title.clientWidth &&
          (heading.right <= button.left || heading.bottom <= button.top)
        )
      }),
    ).toBe(true)
  }
}

test('ampliar/recolher preserva seleção, montagem, passos e descobertas', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await chip(page).click()
  await expand(page).click()
  await expect(page.getByRole('dialog', { name: 'Uma vez e sempre' })).toBeVisible()
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Colocar em Ao iniciar: Mover a nave um pouquinho', exact: true })
    .click()
  const step = page.getByRole('button', { name: 'Avançar 1 passo', exact: true })
  for (let n = 0; n < 3; n++) await step.click()
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.sz-scene-console-visual')).toBeInViewport({ ratio: 1 })
  await expect(step).toBeInViewport({ ratio: 1 })
  const visual = await page.locator('.sz-scene-console-visual').boundingBox()
  const actions = await page.locator('.sz-scene-console-actions').boundingBox()
  expect(visual!.x + visual!.width).toBeLessThanOrEqual(actions!.x + 1)
  await fits(page)
  await page.screenshot({ path: info.outputPath('expanded.png') })

  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('[data-once-area="start"] .sz-once-card')).toHaveCount(1)
  await expand(page).click()
  await page.getByRole('button', { name: 'Voltar ao começo', exact: true }).click()
  await chip(page).click()
  await page
    .getByRole('button', {
      name: 'Colocar em Enquanto estiver rodando: Mover a nave um pouquinho',
      exact: true,
    })
    .click()
  for (let n = 0; n < 3; n++) await step.click()
  await expect(chip(page)).toContainText('3 vezes')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '2')
  await close(page).click()
  await expect(chip(page)).toContainText('3 vezes')
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('foco fica dentro da experiência ampliada e Escape devolve ao gatilho', async ({ page }) => {
  await page.goto('/')
  await expand(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  for (let n = 0; n < 15; n++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
})

test('o palpite mantém pergunta e alternativas juntas, sem controles, ao ampliar', async ({
  page,
}) => {
  await page.goto('/?block=experiencia-coordenadas')
  const choices = page.getByRole('button', { name: 'Para baixo', exact: true })
  await expect(choices).toBeVisible()
  await expand(page).click()
  await expect(page.locator('.sz-scene-prancha')).toHaveCount(0)
  await expect(page.locator('.sz-scene-console-actions')).toContainText('Se o y AUMENTAR')
  await close(page).click()
  await expect(choices).toBeVisible()
  await expand(page).click()
  await choices.click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await close(page).click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
})

for (const block of ['experiencia-criar-mostrar', 'experiencia-quadro', 'experiencia-camadas']) {
  test(`outra experiência do piloto: ${block}`, async ({ page }) => {
    await page.goto(`/?block=${block}`)
    await expand(page).click()
    await expect(page.locator('.sz-scene-console-visual')).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.sz-scene-console-actions')).toBeVisible()
    await close(page).click()
    await expect(expand(page)).toBeFocused()
  })
}

for (const size of [
  { width: 1366, height: 768, panel: 320 },
  { width: 390, height: 844, panel: 620 },
  { width: 320, height: 568, panel: 620 },
  { width: 1280, height: 600, panel: 620 },
  { width: 1920, height: 600, panel: 620 },
]) {
  test(`fichas cabem em ${size.width}x${size.height}, painel ${size.panel}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(size)
    await page.goto(`/?width=${size.panel}`)
    await expect(chip(page)).toBeVisible()
    await fits(page)
    await chip(page).click()
    await page
      .getByRole('button', {
        name: 'Colocar em Enquanto estiver rodando: Mover a nave um pouquinho',
        exact: true,
      })
      .click()
    await fits(page)
    await page.screenshot({ path: info.outputPath('inline.png'), fullPage: true })
    await expand(page).click()
    await fits(page)
    if (size.width >= 960) {
      await expect(page.locator('.sz-scene-console-mundo svg').first()).toBeInViewport({ ratio: 1 })
    }
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await page.getByRole('button', { name: 'Avançar 1 passo', exact: true }).click()
    await expect(chip(page)).toContainText('1 vez')
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await close(page).click()
  })
}

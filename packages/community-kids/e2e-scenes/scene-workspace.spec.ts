import { expect, type Locator, type Page, test } from '@playwright/test'

const chip = (page: Page) =>
  page
    .getByRole('button', { name: /Mover a nave um pouquinho/ })
    .filter({ has: page.locator('.sz-once-card-label') })
const expand = (page: Page) => page.getByRole('button', { name: 'Ampliar experiência' })
const close = (page: Page) => page.getByRole('button', { name: 'Voltar à aula' })

test('retorno foca o gatilho mesmo com foco anterior fora da experiência', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Antes da experiência', exact: true }).focus()
  await expand(page).click()
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
})

/** WebKit trunca dimensões da interseção para pixels inteiros (ex.: 318.515625 → 318).
 * Tolerar menos de 1px por borda, sem aceitar recorte proporcional em palcos grandes. */
async function expectFullyVisible(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate(
        (el) =>
          new Promise<boolean>((resolve) => {
            const observer = new IntersectionObserver(([entry]) => {
              if (!entry) return
              observer.disconnect()
              const box = entry.boundingClientRect
              const visible = entry.intersectionRect
              resolve(
                entry.isIntersecting &&
                  box.width > 0 &&
                  box.height > 0 &&
                  visible.left - box.left < 1 &&
                  visible.top - box.top < 1 &&
                  box.right - visible.right < 1 &&
                  box.bottom - visible.bottom < 1,
              )
            })
            observer.observe(el)
          }),
      ),
    )
    .toBe(true)
}

async function expectLayout(page: Page, sideBySide: boolean) {
  await expect
    .poll(() =>
      page.locator('.sz-scene-console').evaluate((el) => {
        const visual = el.querySelector('.sz-scene-console-visual')?.getBoundingClientRect()
        const actions = el.querySelector('.sz-scene-console-actions')?.getBoundingClientRect()
        if (!visual || !actions) throw new Error('Regiões da experiência ausentes')
        return visual.right <= actions.left + 1 && Math.abs(visual.top - actions.top) < 1
      }),
    )
    .toBe(sideBySide)
}

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

test('margens laterais da cena ficam equilibradas no painel dividido', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?width=900')
  await expectLayout(page, true)

  await expectBalancedSceneMargins(page)
})

async function expectBalancedSceneMargins(page: Page) {
  await expect(page.locator('.sz-scene-console-visual .sz-scene-frame')).toBeVisible()
  const edges = await page.locator('.sz-scene-console-visual').evaluate((visual) => {
    const frame = visual.querySelector('.sz-scene-frame')
    if (!frame) throw new Error('Cena ausente')
    const panel = visual.getBoundingClientRect()
    const scene = frame.getBoundingClientRect()
    return {
      left: scene.left - panel.left,
      right: panel.right - scene.right,
      gutter: getComputedStyle(visual).scrollbarGutter,
    }
  })
  expect(Math.abs(edges.left - edges.right)).toBeLessThan(1)
  expect(edges.gutter).toBe('stable both-edges')
}

test('a divisória adapta o painel sem ampliar nem perder seleção e progresso', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?split')
  await expectLayout(page, false)
  await chip(page).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  const divider = page.getByRole('separator', { name: 'Mudar o tamanho dos dois lados' })
  const box = await divider.boundingBox()
  if (!box) throw new Error('Divisória ausente')
  await page.mouse.move(box.x + box.width / 2, box.y + 24)
  await page.mouse.down()
  await page.mouse.move(360, box.y + 24, { steps: 20 })
  await page.mouse.up()
  await expectLayout(page, true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Vídeo da aula', { exact: true })).toBeInViewport({ ratio: 1 })
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Colocar em Ao iniciar: Mover a nave um pouquinho', exact: true })
    .click()
  const run = page.getByRole('button', {
    name: /^(Começar o jogo|Pausar o jogo|Teste encerrado)$/,
  })
  await run.click()
  await expect(page.getByRole('button', { name: 'Teste encerrado' })).toBeVisible()
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  await expectFullyVisible(page.locator('.sz-scene-console-mundo svg').first())
  await expect(run).toBeInViewport({ ratio: 1 })
  await fits(page)
  await page.screenshot({ path: info.outputPath('inline-wide.png') })

  await divider.focus()
  await divider.press('End')
  await expectLayout(page, false)
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  await fits(page)
  await expand(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveCSS('position', 'fixed')
  expect(await dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 1366, height: 768 })
  await expectLayout(page, true)
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
  await expectLayout(page, false)
  await expect(chip(page)).toContainText('1 vez')
  await divider.focus()
  await divider.press('Home')
  await expectLayout(page, true)
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
})

test('o palpite também adapta pela largura do painel e preserva a resposta', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?split&block=experiencia-coordenadas')
  const divider = page.getByRole('separator', { name: 'Mudar o tamanho dos dois lados' })
  await expectLayout(page, false)
  await divider.focus()
  await divider.press('Home')
  await expectLayout(page, true)
  await expect(page.locator('.sz-scene-prancha')).toHaveCount(0)
  await expect(page.locator('.sz-scene-console-actions')).toContainText('Se o y AUMENTAR')
  await page.getByRole('button', { name: 'Para baixo', exact: true }).click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expectLayout(page, true)
  await divider.focus()
  await divider.press('End')
  await expectLayout(page, false)
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Para baixo', exact: true })).toHaveCount(0)
})

test('fontes maiores empilham sem cortar os controles no modo ampliado', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?width=1000')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px'
  })
  await expectLayout(page, false)
  await expand(page).click()
  await expectLayout(page, false)
  const run = page.getByRole('button', { name: 'Coloque uma ação para começar' })
  await run.scrollIntoViewIfNeeded()
  await expect(run).toBeInViewport({ ratio: 1 })
  await expect(close(page)).toBeInViewport({ ratio: 1 })
  await close(page).click()
  await expect(expand(page)).toBeFocused()
})

for (const size of [
  { panel: 860, height: 768, sideBySide: false },
  { panel: 900, height: 768, sideBySide: true },
  { panel: 1000, height: 480, sideBySide: false },
]) {
  test(`layout inline: painel ${size.panel}, altura ${size.height}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1366, height: size.height })
    await page.goto(`/?width=${size.panel}`)
    await expectLayout(page, size.sideBySide)
    await fits(page)
    await page.screenshot({ path: info.outputPath('inline-adaptive.png'), fullPage: true })
  })
}

test('ampliar/recolher preserva seleção, montagem, execução e descobertas', async ({
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
  const run = page.getByRole('button', {
    name: /^(Começar o jogo|Pausar o jogo|Teste encerrado)$/,
  })
  await run.click()
  await expect(page.getByRole('button', { name: 'Teste encerrado' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(chip(page)).toContainText('1 vez')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  await expectFullyVisible(page.locator('.sz-scene-console-visual'))
  await expect(run).toBeInViewport({ ratio: 1 })
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
  await run.click()
  await expect(page.getByRole('button', { name: 'Teste encerrado' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(chip(page)).toContainText(/[1-9]\d* vezes/)
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '2')
  const count = await chip(page).textContent()
  await close(page).click()
  await expect(chip(page)).toHaveText(count ?? '')
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

for (const block of [
  'experiencia-coordenadas',
  'experiencia-criar-mostrar',
  'experiencia-quadro',
  'experiencia-camadas',
]) {
  test(`outra experiência do piloto: ${block}`, async ({ page }, info) => {
    await page.goto(`/?block=${block}&width=900`)
    await expectLayout(page, true)
    if (block === 'experiencia-coordenadas')
      await page.getByRole('button', { name: 'Para baixo', exact: true }).click()
    if (block === 'experiencia-criar-mostrar')
      await page.getByRole('button', { name: 'A tela fica vazia', exact: true }).click()
    await expectBalancedSceneMargins(page)
    await page.screenshot({ path: info.outputPath('inline.png') })
    for (const region of await page
      .locator('.sz-scene-console-visual, .sz-scene-console-actions')
      .all()) {
      expect(await region.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    }
    await expand(page).click()
    await expectFullyVisible(page.locator('.sz-scene-console-visual'))
    await expectBalancedSceneMargins(page)
    await expect(page.locator('.sz-scene-console-actions')).toBeVisible()
    await close(page).click()
    await expect(expand(page)).toBeFocused()
    await expectLayout(page, true)
  })
}

for (const viewport of [
  { width: 1366, height: 768, panel: 900 },
  { width: 390, height: 844, panel: 620 },
]) {
  test(`camadas começa com parte da nave à vista em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(`/?block=experiencia-camadas&width=${viewport.panel}`)
    const composition = await page.locator('.sz-scene-console-mundo svg').evaluate((svg) => {
      const ship = svg.querySelector('[data-figure="nave"]')?.getBoundingClientRect()
      const starCard = svg.querySelector('[data-figure="estrelas"] rect')?.getBoundingClientRect()
      if (!ship || !starCard) throw new Error('Nave ou cartão de estrelas ausente')
      const caption = [...svg.querySelectorAll('text')]
        .find((text) => text.textContent?.includes('Quem fica na frente'))
        ?.getBoundingClientRect()
      return {
        visibleFraction: (starCard.left - ship.left) / ship.width,
        captionCovered: Boolean(
          caption &&
            caption.left < starCard.right &&
            caption.right > starCard.left &&
            caption.top < starCard.bottom &&
            caption.bottom > starCard.top,
        ),
      }
    })
    expect(composition.visibleFraction).toBeGreaterThan(0.35)
    expect(composition.visibleFraction).toBeLessThan(0.8)
    expect(composition.captionCovered).toBe(false)
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
      await expectFullyVisible(page.locator('.sz-scene-console-mundo svg').first())
    }
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await page.getByRole('button', { name: 'Começar o jogo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Teste encerrado' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(chip(page)).toContainText(/[1-9]\d* vezes/)
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await close(page).click()
  })
}

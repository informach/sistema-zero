import { expect, type Page, test } from '@playwright/test'

async function assertClear(page: Page) {
  await expect(page.locator('[data-trail-body]').first()).toBeVisible()
  for (const unit of await page.locator('[data-trail-body]').all()) {
    await unit.scrollIntoViewIfNeeded()
    await expect(unit.locator('[data-trail-art]')).toHaveAttribute('data-trail-art-ready', 'true')
    const problems = await unit.evaluate((body) => {
      const art = body.querySelector('[data-trail-art]')!.getBoundingClientRect()
      const bounds = body.getBoundingClientRect()
      const collisions = [...body.querySelectorAll('[data-trail-obstacle], .kids-balloon')]
        .filter((el) => {
          const box = el.getBoundingClientRect()
          return (
            art.right + 11 > box.left &&
            art.left - 11 < box.right &&
            art.bottom + 11 > box.top &&
            art.top - 11 < box.bottom
          )
        })
        .map((el) => el.textContent)
      return {
        collisions,
        outside:
          art.left < bounds.left - 1 ||
          art.right > bounds.right + 1 ||
          art.top < bounds.top - 1 ||
          art.bottom > bounds.bottom + 1,
      }
    })
    expect(problems).toEqual({ collisions: [], outside: false })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
}

for (const width of [320, 390, 430, 768, 1440]) {
  test(`ediSVG com tamanho proporcional e sem sobreposição em ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/trail-animation')
    await assertClear(page)
    expect(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    ).toBe(true)
    const art = await page.locator('[data-trail-art]').first().boundingBox()
    expect(art).not.toBeNull()
    if (width > 640) expect(art!.width).toBe(250)
    else {
      expect(art!.width).toBeGreaterThanOrEqual(130)
      expect(art!.width).toBeLessThanOrEqual(160)
    }
    expect(art!.width / art!.height).toBeCloseTo(9 / 8, 2)
    expect(errors).toEqual([])
    await page.locator('main').screenshot({ path: info.outputPath(`trilha-${width}.png`) })
  })
}

test('recalcula ao mudar a coluna e mantém a reserva quando o arquivo falha', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/trail-animation?rows=1')
  await assertClear(page)
  await page.setViewportSize({ width: 320, height: 900 })
  await assertClear(page)
  const body = page.locator('[data-trail-body]')
  expect(
    await body.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)),
  ).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Trocar arquivo' }).click()
  await assertClear(page)
  await expect(body.locator('[data-trail-art] img')).toBeVisible()
  await page.getByRole('button', { name: 'Trocar arquivo' }).click()
  await assertClear(page)
})

test('movimento reduzido mantém a arte e economia de dados não deixa espaço vazio', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/trail-animation?rows=1')
  await assertClear(page)
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    }),
  )
  await page.reload()
  await expect(page.locator('[data-trail-art] svg')).toHaveCount(0)
  await assertClear(page)
})

for (const action of ['Remover ou recolocar arte', 'Trocar arquivo']) {
  test(`voltar à mesma arte preserva a reserva e as aulas: ${action}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 })
    await page.goto('/trail-animation?rows=1&controls')
    await assertClear(page)
    const lessons = page.locator('ol > li')
    const before = await lessons.allTextContents()
    await page.getByRole('button', { name: action }).click()
    if (action === 'Remover ou recolocar arte')
      await expect(page.locator('[data-trail-art]')).toHaveCount(0)
    else {
      await assertClear(page)
      await expect(page.locator('[data-trail-art] img')).toBeVisible()
    }
    await page.getByRole('button', { name: action }).click()
    await assertClear(page)
    expect(await lessons.allTextContents()).toEqual(before)
  })
}

for (const mode of ['saveData', 'falha']) {
  test(`reserva conserva seu espaço quando o motor não carrega: ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 400 })
    if (mode === 'saveData')
      await page.addInitScript(() =>
        Object.defineProperty(navigator, 'connection', {
          value: { saveData: true },
          configurable: true,
        }),
      )
    await page.goto('/trail-animation?rows=1&controls&removed&broken')
    await expect(page.locator('[data-trail-body]')).toBeVisible()
    const failedRequest =
      mode === 'falha'
        ? page.waitForResponse((response) => response.url().endsWith('/missing.edi-animation.json'))
        : null
    await page.getByRole('button', { name: 'Remover ou recolocar arte' }).click()
    if (failedRequest) expect((await failedRequest).status()).toBe(404)
    await assertClear(page)
    await expect(page.locator('[data-trail-art] img')).toBeVisible()
  })
}

test('atualiza os obstáculos e reage à largura da coluna sem resize da janela', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/trail-animation?rows=5&controls')
  await assertClear(page)
  await page.getByRole('button', { name: 'Avançar aula' }).click()
  await expect(page.locator('ol > li').nth(1).locator('.kids-balloon')).toBeVisible()
  await page.locator('main').evaluate((el) => {
    el.style.width = '390px'
  })
  await assertClear(page)
  expect((await page.locator('[data-trail-art]').boundingBox())?.width).toBe(250)
  await page.locator('main').evaluate((el) => {
    el.style.width = ''
  })
  await assertClear(page)
})

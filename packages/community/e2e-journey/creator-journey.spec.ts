import { expect, test } from '@playwright/test'

for (const skin of ['adult', 'kids'])
  for (const width of [390, 768, 1440])
    for (const screen of ['map', 'post', 'areas', 'mastery']) {
      test(`${skin} ${screen} at ${width}px preserves readable content and navigation`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 1000 })
        await page.goto(
          `/?skin=${skin}&screen=${screen}&state=${screen === 'mastery' ? 'mastery' : 'pair'}`,
        )
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expect(page.getByRole('main')).toBeVisible()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
        expect(overflow).toBe(false)
        if (screen === 'post') {
          await expect(
            page.getByRole('heading', { name: 'O que conta para avançar' }),
          ).toBeVisible()
          await page.locator('summary').first().click()
          await expect(page.locator('details').first()).toHaveAttribute('open', '')
        }
        if (screen === 'mastery') {
          await expect(page.getByText('Ajustes pedidos pela equipe')).toBeVisible()
          await expect(page.getByRole('combobox').first()).toBeEnabled()
          await expect(page.locator('details[open]')).toHaveCount(1)
          const overlappingCourses = await page.locator('article').evaluateAll((courses) =>
            courses.some((course) => {
              const parent = course.parentElement
              return (
                parent?.classList.contains('space-y-3') &&
                course.getBoundingClientRect().bottom > parent.getBoundingClientRect().bottom + 1
              )
            }),
          )
          expect(overlappingCourses).toBe(false)
        }
        if (skin === 'adult') {
          const fontSize = await page
            .getByRole('heading', { level: 1 })
            .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
          expect(fontSize).toBeGreaterThanOrEqual(30)
        }
        await page.screenshot({
          path: `.cache/creator-journey-${skin}-${screen}-${width}.png`,
          fullPage: true,
        })
      })
    }

test('planned courses keep their name without an action to unavailable content', async ({
  page,
}) => {
  await page.goto('/?skin=adult&screen=post&state=planned')
  await expect(page.getByText('Curso em preparação').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir curso' })).toHaveCount(0)
})

test('direct purchase opens only its course while the pair is incomplete', async ({ page }) => {
  await page.goto('/?skin=kids&screen=post&state=direct')
  const extras = page.locator('section[aria-labelledby="extras-posto"]')
  await expect(extras.getByRole('link', { name: 'Abrir curso' }).first()).toBeVisible()
  await expect(
    page
      .locator('section[aria-labelledby="missao-posto"]')
      .getByRole('link', { name: 'Abrir curso' }),
  ).toHaveCount(0)
})

for (const width of [390, 1440]) {
  test(`admin mastery review at ${width}px preserves rubric and feedback controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/admin-review')
    await expect(
      page.getByRole('heading', { name: 'Revisar Maestrias', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const dismissPintaGuide = page.getByRole('button', { name: 'Entendi!', exact: true })
    if (await dismissPintaGuide.isVisible()) await dismissPintaGuide.click()
    const criteria = page.locator('select[id^="criterion-"]')
    expect(await criteria.count()).toBeGreaterThan(2)
    await criteria.first().selectOption('revise')
    await page
      .locator('#feedback-0')
      .fill(
        'Compare o objeto com o cenário e aumente o contraste para que ele seja identificado durante a partida.',
      )
    await page
      .locator('#mastery-feedback')
      .fill('Você já integrou seus desenhos ao jogo. Revise a leitura do objeto e teste novamente.')
    await expect(page.getByRole('button', { name: 'Registrar avaliação' })).toBeEnabled()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false)
    await page.screenshot({
      path: `.cache/creator-journey-admin-review-${width}.png`,
      fullPage: true,
    })
  })
}

for (const width of [390, 1440]) {
  test(`admin Python source review ${width}: every submitted file remains readable outside the observer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/admin-review?evidence=python')
    const source = page.getByRole('region', { name: 'Arquivos da versão enviada' })
    await expect(source).toBeVisible()
    await source.locator('summary').filter({ hasText: 'src/helper.py' }).click()
    await expect(source.getByRole('region', { name: 'Código de src/helper.py' })).toHaveText(
      'n = 42',
    )
    await expect(source.locator('input, textarea, [contenteditable="true"], [inert]')).toHaveCount(
      0,
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false)
    await page.screenshot({
      path: `.cache/creator-journey-admin-python-${width}.png`,
      fullPage: true,
    })
  })
}

for (const width of [390, 1440]) {
  test(`admin gallery review ${width}: preserved copies open and switch without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/admin-review?evidence=gallery')
    await expect(page.getByRole('button', { name: 'Baixar trabalho aberto' })).toBeEnabled()
    const guide = page.getByRole('button', { name: 'Entendi!', exact: true })
    await expect(guide).toBeVisible()
    await guide.click()
    await expect(guide).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Cenário do jardim', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Chave que aparece no cenário', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Baixar trabalho aberto' })).toBeEnabled()
    await expect(
      page.getByRole('button', { name: 'Chave que aparece no cenário', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar trabalho aberto' }).click()
    expect((await download).suggestedFilename()).toBe('chave-dourada.pinta.json')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false)
    await page.screenshot({
      path: `.cache/creator-journey-admin-gallery-${width}.png`,
      fullPage: true,
    })
  })
}

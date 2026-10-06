import { expect, test } from '@playwright/test'

test('o título repetido da seção volta a ser visível ao ampliar a experiência', async ({
  page,
}) => {
  await page.goto('/?repeated-title')
  const title = page.getByRole('heading', { level: 3 })
  await expect(title).toHaveCSS('width', '1px')
  await page.getByRole('button', { name: 'Ampliar experiência' }).click()
  await expect(title).toHaveCSS('clip-path', 'none')
  await expect(title).toBeInViewport({ ratio: 1 })
  await page.getByRole('button', { name: 'Voltar à fase' }).click()
  await expect(title).toHaveCSS('width', '1px')
})

for (const activity of [
  { path: '/project-play', expand: 'Ampliar jogo', badge: 'Brinque', body: 'iframe' },
  { path: '/', expand: 'Ampliar experiência', badge: 'Experimente', body: '.sz-scene-console' },
]) {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`${activity.badge} conserva título, badge e cartão ao ampliar em ${viewport.width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize(viewport)
      await page.goto(activity.path)
      // Os nomes são fornecidos por next/font no app. O ensaio usa os mesmos tokens sem rede.
      await page.addStyleTag({
        content: ':root { --font-baloo: "Baloo 2"; --font-nunito: Nunito; }',
      })
      const block = page.locator('.sz-lesson-block')
      const title = block.getByRole('heading', { level: 3 })
      const titleText = await title.innerText()
      const cardStyle = await block.evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          padding: style.padding,
        }
      })
      const body = await block.locator(activity.body).elementHandle()
      await page.getByRole('button', { name: activity.expand }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText(activity.badge, { exact: true })).toBeVisible()
      await expect(dialog.getByRole('heading', { name: titleText, exact: true })).toBeVisible()
      await expect(title).toHaveCSS('font-family', /Baloo 2/)
      const card = dialog.locator('.sz-activity-workspace-card')
      await expect(card).toHaveCSS('background-color', cardStyle.backgroundColor)
      await expect(card).toHaveCSS('border-radius', cardStyle.borderRadius)
      await expect(card).toHaveCSS('padding', cardStyle.padding)
      expect(await body!.evaluate((el) => el.isConnected)).toBe(true)
      await expect(page.getByRole('button', { name: 'Voltar à fase' })).toBeInViewport({ ratio: 1 })
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      await page.screenshot({ path: info.outputPath('bloco-ampliado.png') })
      await page.getByRole('button', { name: 'Voltar à fase' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('button', { name: activity.expand })).toBeFocused()
      await expect(title).toHaveCSS('font-family', /Baloo 2/)
      expect(await body!.evaluate((el) => el.isConnected)).toBe(true)
    })
  }
}

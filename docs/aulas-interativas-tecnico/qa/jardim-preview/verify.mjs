import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium, expect } = createRequire(resolve('packages/studio/package.json'))(
  '@playwright/test',
)
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } }),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(pathToFileURL(resolve('.cache/jardim-quiz.html')).href)
    for (const [i, answer] of [1, 0, 2, 1].entries()) {
      await expect(page.getByRole('radio')).toHaveCount(3)
      const classes = await page
        .getByRole('radio')
        .evaluateAll((options) => options.map((o) => o.className))
      if (new Set(classes).size !== 1)
        throw Error('Alternativas com aparência desigual antes da escolha')
      if (i > 1) {
        await page.locator('canvas').waitFor()
        await expect(page.getByText('Preparando a cena…')).toHaveCount(0)
      }
      await page.screenshot({
        path: resolve(`.cache/jardim-quiz-${width}-${i + 1}-antes.png`),
        fullPage: true,
      })
      if (i === 0) {
        await page.getByRole('radio').nth(0).click()
        await page.getByRole('button', { name: 'Ver o que acontece', exact: true }).click()
        await expect(
          page.getByRole('button', { name: 'Tentar de novo', exact: true }),
        ).toBeVisible()
        await page
          .getByRole('button', { name: 'Comparar com a coleta guardando Sim', exact: true })
          .click()
        await expect(page.getByText('Pegou o regador? Sim', { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
      }
      await page.getByRole('radio').nth(answer).click()
      await page
        .getByRole('button', { name: i === 1 ? 'Responder' : 'Ver o que acontece', exact: true })
        .click()
      await expect(page.getByText('Isso mesmo.', { exact: true })).toBeVisible()
      await page.screenshot({
        path: resolve(`.cache/jardim-quiz-${width}-${i + 1}-depois.png`),
        fullPage: true,
      })
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        throw Error('Overflow horizontal')
      await page
        .getByRole('button', {
          name: i === 3 ? 'Concluir revisão' : 'Próxima pergunta',
          exact: true,
        })
        .click()
    }
    await expect(page.getByText('Quiz conferido', { exact: true })).toBeVisible()
    if (errors.length) throw Error(errors.join('\n'))
    await page.close()
    console.log(
      `${width}px: quatro perguntas, erro, nova tentativa, comparação e conclusão passaram.`,
    )
  }
} finally {
  await browser.close()
}

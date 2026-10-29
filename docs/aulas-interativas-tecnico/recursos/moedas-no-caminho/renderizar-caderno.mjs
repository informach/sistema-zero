import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const out = resolve(root, 'tmp/pdfs/moedas-no-caminho')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } })
  await page.goto(pathToFileURL(resolve(out, 'caderno.html')).href)
  await page.emulateMedia({ media: 'print' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  const overflow = await page.locator('.page').evaluateAll((pages) =>
    pages.flatMap((p) => {
      const content = p.querySelector('.content'),
        footer = p.querySelector('.page-no')
      if (
        content &&
        footer &&
        content.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 10
      )
        return [p.dataset.id]
      if (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)
        return [p.dataset.id]
      return []
    }),
  )
  if (overflow.length) throw Error(`Conteúdo fora da página: ${overflow.join(', ')}`)
  const pdf = resolve(
    root,
    'docs/aulas-interativas/faisca/poder-moedas-no-caminho/passo-a-passo-do-projeto.pdf',
  )
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })
  const pages = page.locator('.page')
  for (let i = 0; i < (await pages.count()); i++)
    await pages
      .nth(i)
      .screenshot({ path: resolve(out, `pagina-${String(i + 1).padStart(2, '0')}.png`) })
  console.log(`PDF gerado, ${await pages.count()} páginas sem overflow.`)
} finally {
  await browser.close()
}

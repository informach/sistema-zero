import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const out = resolve(root, 'tmp/pdfs/ilha-farol')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(pathToFileURL(resolve(root, '.cache/ilha-do-farol/curso-preview.html')).href)
  const images = {}
  async function shot(name) {
    await page.locator('[data-ready="true"]').waitFor()
    const style = await page.addStyleTag({
      content:
        'body{visibility:hidden!important}.sz-island-world{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;z-index:99999!important;width:960px!important;height:540px!important;min-height:0!important;aspect-ratio:auto!important}.sz-island-view{display:none!important}',
    })
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )
    const png = await page
      .locator('.sz-island-canvas canvas')
      .screenshot({ path: resolve(out, `${name}.png`) })
    images[name] = 'data:image/png;base64,' + png.toString('base64')
    await style.evaluate((el) => el.remove())
  }
  await shot('ilha')
  await page.getByRole('button', { name: 'Ver de lado', exact: true }).click()
  await shot('vista-lado')
  await page.getByRole('button', { name: 'experiencia-posicao-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  await page.getByRole('spinbutton', { name: 'Valor y', exact: true }).fill('3')
  await shot('posicao')
  await page.getByRole('button', { name: 'experiencia-contato-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  await page.getByRole('button', { name: 'Ver de lado', exact: true }).click()
  await page.getByRole('button', { name: 'Mostrar onde encosta', exact: true }).click()
  await shot('contato')
  if (errors.length) throw Error(errors.join('\n'))
  const html = readFileSync(resolve(out, 'caderno.template.html'), 'utf8').replace(
    /data-image="([^"]+)"/g,
    (_, id) => {
      if (!images[id]) throw Error('Ilustração ausente: ' + id)
      return `src="${images[id]}"`
    },
  )
  writeFileSync(resolve(out, 'caderno.html'), html)
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
  if (overflow.length) throw Error('Conteúdo fora da página: ' + overflow.join(', '))
  const pdf = resolve(
    root,
    'docs/aulas-interativas/faisca/a-ilha-do-farol/passo-a-passo-do-projeto.pdf',
  )
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })
  console.log('PDF conferido e gerado: ' + pdf)
} finally {
  await browser.close()
}

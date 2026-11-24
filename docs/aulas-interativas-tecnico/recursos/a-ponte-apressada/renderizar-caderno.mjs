/**
 * Confere o Passo a passo do projeto de A ponte apressada página por página e grava o PDF.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/a-ponte-apressada/gerar-caderno.ts
 *   node docs/aulas-interativas-tecnico/recursos/a-ponte-apressada/renderizar-caderno.mjs
 *
 * Grava um PNG por página em `tmp/pdfs/a-ponte-apressada/paginas/` para olhar uma a uma, e para
 * com erro se algum conteúdo passar do rodapé ou da folha, ou se um parágrafo, item ou título
 * terminar com uma palavra sozinha na última linha. Sem erro, grava o PDF na pasta do curso.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const out = resolve(root, 'tmp/pdfs/a-ponte-apressada')
const paginas = resolve(out, 'paginas')
rmSync(paginas, { recursive: true, force: true })
mkdirSync(paginas, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1200 },
    deviceScaleFactor: 1.5,
  })
  await page.goto(pathToFileURL(resolve(out, 'caderno.html')).href)
  await page.emulateMedia({ media: 'print' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  const problemas = await page.locator('.page').evaluateAll((folhas) =>
    folhas.flatMap((folha) => {
      const erros = []
      const id = folha.dataset.id
      const limite = folha.getBoundingClientRect()
      const rodape = folha.querySelector('.page-no')?.getBoundingClientRect()
      const seguro = rodape ? rodape.top - 18 : limite.bottom - 20
      const content = folha.querySelector('.content')
      const fim = content ? content.getBoundingClientRect().bottom : 0
      if (fim > seguro)
        erros.push(`${id}: conteúdo invade o rodapé em ${Math.ceil(fim - seguro)} px`)
      for (const el of folha.querySelectorAll('.content *, .inner > *')) {
        const r = el.getBoundingClientRect()
        if (r.right > limite.right + 1 || r.left < limite.left - 1)
          erros.push(`${id}: ${el.getAttribute('class') || el.tagName} passa da largura da folha`)
      }
      // Palavra sozinha: a última linha de um texto com mais de uma linha tem uma palavra só.
      for (const el of folha.querySelectorAll('p, li, h2, h3, figcaption')) {
        const palavras = []
        const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = andar.nextNode(); n; n = andar.nextNode()) {
          for (const m of n.textContent.matchAll(/\S+/g)) {
            const range = document.createRange()
            range.setStart(n, m.index)
            range.setEnd(n, m.index + m[0].length)
            const r = range.getBoundingClientRect()
            if (r.width > 0) palavras.push({ topo: Math.round(r.top), texto: m[0] })
          }
        }
        const linhas = [...new Set(palavras.map((p) => p.topo))]
        if (linhas.length < 2) continue
        const ultima = palavras.filter((p) => Math.abs(p.topo - linhas.at(-1)) < 4)
        if (ultima.length === 1 && ultima[0].texto.length > 1)
          erros.push(
            `${id}: palavra sozinha "${ultima[0].texto}" em "${el.textContent.slice(0, 50)}…"`,
          )
      }
      return erros
    }),
  )
  const folhas = page.locator('.page')
  const n = await folhas.count()
  for (let i = 0; i < n; i++)
    await folhas
      .nth(i)
      .screenshot({ path: resolve(paginas, `pagina-${String(i + 1).padStart(2, '0')}.png`) })
  if (problemas.length) {
    console.error(problemas.join('\n'))
    process.exitCode = 1
  } else {
    const pdf = resolve(
      root,
      'docs/aulas-interativas/faisca/poder-a-ponte-apressada/passo-a-passo-do-projeto.pdf',
    )
    await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })
    console.log(`PDF gerado: ${n} páginas, sem nada fora da folha nem palavra sozinha.`)
  }
  console.log(`PNGs em ${paginas}`)
} finally {
  await browser.close()
}

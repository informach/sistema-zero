/**
 * PDF e prints do Passo a passo de O segredo da cabana, com as conferências de
 * `../desafio-farol/gerar-materiais.py` (fontes, imagens, cores dos blocos do Estúdio e nada
 * invadindo o rodapé, 18 px acima dele). Rode depois de `bun gerar-caderno.ts`. Os prints de cada
 * folha (`pagina-NN.png`) ficam em `tmp/pdfs/o-segredo-da-cabana/`, para olhar página por página.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const out = resolve(root, 'tmp/pdfs/o-segredo-da-cabana')
const cores = JSON.parse(readFileSync(resolve(out, 'cores-estudio.json'), 'utf8'))
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
  const relatorio = await page.evaluate((cores) => {
    const erros = []
    if (!document.fonts.check('16px Nunito') || !document.fonts.check('16px "Baloo 2"'))
      erros.push('Fontes não carregadas')
    for (const imagem of document.images)
      if (!imagem.complete || imagem.naturalWidth === 0) erros.push('Imagem não carregada')
    const blocos = document.querySelectorAll('[data-block-type]')
    for (const bloco of blocos) {
      const hex = cores[bloco.dataset.blockType]
      const rgb = hex
        ? `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')})`
        : null
      if (!rgb || getComputedStyle(bloco).backgroundColor !== rgb)
        erros.push(`Cor diferente do Estúdio: ${bloco.dataset.blockType}`)
    }
    for (const folha of document.querySelectorAll('.page')) {
      const limites = folha.getBoundingClientRect()
      const rodape = folha.querySelector('.page-no')?.getBoundingClientRect()
      const conteudo = folha.querySelector('.content')
      const fundo = rodape ? rodape.top - 18 : limites.bottom - 20
      if (conteudo && conteudo.getBoundingClientRect().bottom > fundo)
        erros.push(`${folha.dataset.id}: conteúdo invade o rodapé`)
      for (const item of folha.querySelectorAll('.content *, .inner > *')) {
        const caixa = item.getBoundingClientRect()
        if (
          caixa.right > limites.right + 1 ||
          caixa.left < limites.left - 1 ||
          caixa.bottom > fundo + 1
        )
          erros.push(`${folha.dataset.id}: ${item.className || item.tagName} fora dos limites`)
      }
    }
    return {
      paginas: document.querySelectorAll('.page').length,
      blocos: blocos.length,
      erros: [...new Set(erros)],
    }
  }, cores)
  writeFileSync(resolve(out, 'layout-check.json'), JSON.stringify(relatorio, null, 2))
  if (relatorio.erros.length) throw Error(relatorio.erros.join('\n'))
  const pdf = resolve(
    root,
    'docs/aulas-interativas/faisca/poder-o-segredo-da-cabana/passo-a-passo-do-projeto.pdf',
  )
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })
  const folhas = page.locator('.page')
  for (let i = 0; i < relatorio.paginas; i++)
    await folhas
      .nth(i)
      .screenshot({ path: resolve(out, `pagina-${String(i + 1).padStart(2, '0')}.png`) })
  console.log(
    `${relatorio.paginas} páginas; fontes, imagens, ${relatorio.blocos} blocos e limites conferidos. ${pdf}`,
  )
} finally {
  await browser.close()
}

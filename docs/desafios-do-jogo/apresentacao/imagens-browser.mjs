import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Abre cada gabarito numa origem de mentira, espera o jogo desenhar, fotografa o palco e reduz
// para a miniatura do Quadro (320 por 192, a proporção 5:3 dos jogos 2D) em WebP. O controle de
// toque do Jogo 2D sai da foto, e o Enter passa da tela de abertura (todos os jogos com abertura
// começam com Enter; nos outros ele só recomeça o que já estava no começo).
const { chromium } = await import(process.env.SZ_PLAYWRIGHT_URL)
const [dir, out] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const LARGURA = 320
const ALTURA = 192
const browser = await chromium.launch({
  executablePath: process.env.SZ_CHECK_CHROMIUM,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
let falhas = 0
try {
  const context = await browser.newContext({ viewport: { width: 800, height: 480 } })
  for (const arquivo of (await readdir(dir)).filter((a) => a.endsWith('.html')).sort()) {
    const slug = arquivo.slice(0, -'.html'.length)
    const html = await readFile(join(dir, arquivo), 'utf8')
    const page = await context.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.route('https://print.invalid/', (r) =>
      r.fulfill({ contentType: 'text/html', body: html }),
    )
    try {
      await page.goto('https://print.invalid/', { waitUntil: 'load', timeout: 30_000 })
      await page.evaluate(() => window.SZGame2D?.enableClassicControls?.('off'))
      await page.waitForTimeout(1500)
      await page.mouse.click(400, 240)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1500)
      // De novo: o jogo que monta o controle no começo da partida (o Enter recomeça) o liga outra vez.
      await page.evaluate(() => window.SZGame2D?.enableClassicControls?.('off'))
      await page.waitForTimeout(500)
      const png = await page.screenshot({ type: 'png' })
      const webp = await page.evaluate(
        async ({ b64, largura, altura }) => {
          const img = new Image()
          img.src = `data:image/png;base64,${b64}`
          await img.decode()
          const c = document.createElement('canvas')
          c.width = largura
          c.height = altura
          const ctx = c.getContext('2d')
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, largura, altura)
          return c.toDataURL('image/webp', 0.8).split(',')[1]
        },
        { b64: png.toString('base64'), largura: LARGURA, altura: ALTURA },
      )
      await writeFile(join(out, `${slug}.webp`), Buffer.from(webp, 'base64'))
      console.log(
        `${slug}: ${Math.round((webp.length * 3) / 4)} bytes${erros.length ? ` (erros: ${erros.join(' | ')})` : ''}`,
      )
    } catch (e) {
      falhas++
      console.error(`${slug}: falhou (${e.message})`)
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
if (falhas > 0) process.exit(1)

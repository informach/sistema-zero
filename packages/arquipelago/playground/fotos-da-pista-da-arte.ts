/**
 * As fotos da pista com as peças reais da arte (`/pista-da-arte`): cada peça, o avatar no ponto de
 * jogo dela, em dois instantes; e uma página local (`comparar.html`) com cada foto ao lado da folha
 * da arte, para a dona aprovar. Tudo fica em `.cache/pista-da-arte/` (as peças e o avatar são de
 * uso interno: a página não sai desta máquina). Rode no pacote, com a cópia local do avatar:
 *   bun playground/preparar-pista-da-arte.ts
 *   bun build playground/fotos-da-pista-da-arte.ts --target=node --external playwright-core --outfile .cache/fotos-da-pista-da-arte.mjs
 *   AVATAR_QA_DIR=<cópia do bucket> node .cache/fotos-da-pista-da-arte.mjs
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'

const PASTA = path.resolve('.cache/pista-da-arte')
const pista = JSON.parse(readFileSync(path.join(PASTA, 'pista.json'), 'utf8')) as {
  pecas: { id: string; rotulo: string; folha: string | null }[]
}
const INSTANTES = [1, 3]

const port = await new Promise<number>((ok, falha) => {
  const s = createServer()
  s.once('error', falha)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return falha(new Error('sem porta'))
    s.close(() => ok(a.port))
  })
})
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))

const linhas: string[] = []
try {
  const prazo = Date.now() + 90_000
  while (!pronto) {
    if (Date.now() > prazo) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const SO = process.env.ARQUIPELAGO_PISTA?.split(',')
  for (const peca of pista.pecas.filter((p) => !SO || SO.includes(p.id))) {
    const page = await browser.newPage({ viewport: { width: 720, height: 540 } })
    page.setDefaultTimeout(120_000)
    await page.goto(`http://127.0.0.1:${port}/pista-da-arte?quadros=1&peca=${peca.id}`)
    await page.waitForFunction(() => Boolean((globalThis as { __pista?: unknown }).__pista))
    const avancar = (n: number) =>
      page.evaluate(
        (n) => (globalThis as unknown as { __quadros: (n: number) => void }).__quadros(n),
        n,
      )
    // O avatar e os clipes chegam pela rede: quadros devagar até ele aparecer.
    for (let i = 0; i < 30; i++) {
      await avancar(1)
      await page.waitForTimeout(200)
    }
    const info = await page.evaluate(() => (globalThis as { __pista?: { tipo: string } }).__pista)
    await page.evaluate(() => (globalThis as { __recomecar?: () => void }).__recomecar?.())
    let feito = 0
    const fotos: string[] = []
    for (const t of INSTANTES) {
      await avancar(Math.round((t - feito) * 30))
      feito = t
      await page.waitForTimeout(500)
      const nome = `${peca.id}-${t}s.png`
      await page.screenshot({ path: path.join(PASTA, nome) })
      fotos.push(nome)
    }
    await page.close()
    linhas.push(
      `<section><h2>${peca.rotulo} <small>${peca.id} · ${info?.tipo ?? '?'}</small></h2><div class="fila">${fotos
        .map((f) => `<figure><img src="${f}"><figcaption>${f}</figcaption></figure>`)
        .join(
          '',
        )}${peca.folha ? `<figure><img src="${peca.folha}"><figcaption>folha da arte</figcaption></figure>` : ''}</div></section>`,
    )
    console.log('ok', peca.id, info?.tipo)
  }
  await browser.close()
} finally {
  server.kill()
}
writeFileSync(
  path.join(PASTA, 'comparar.html'),
  `<!doctype html><meta charset="utf-8"><title>Pista com as peças da arte</title><style>body{font:15px system-ui;margin:16px;background:#f4f6fb;color:#1c2141}section{margin:0 0 28px}h2{font-size:17px}small{color:#59628a;font-weight:400}.fila{display:flex;gap:10px;flex-wrap:wrap}figure{margin:0}img{width:360px;border-radius:8px;border:1px solid #d8dff0;background:#fff}figcaption{font-size:12px;color:#59628a}</style><h1>Pista com as peças reais da arte</h1><p>Uso interno: não distribuir. O avatar posto pelos pontos de jogo de cada peça, em ${INSTANTES.join(' s e ')} s, ao lado da folha da arte.</p>${linhas.join('')}`,
)
console.log(`Página: ${path.join(PASTA, 'comparar.html')}`)

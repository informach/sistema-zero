/**
 * B0 da evolução do Estúdio: mede se um programa que TRAVA dentro da prévia trava também a página
 * que a hospeda. Não usa o Estúdio: são páginas mínimas com o mesmo arranjo de iframes.
 *
 *   node scripts/measure-preview-isolation.mjs [--json]
 *
 * Arranjos medidos, com e sem os cabeçalhos do host (COOP same-origin + COEP credentialless):
 *   - `srcdoc`: o de hoje, `<iframe sandbox="allow-scripts allow-modals allow-pointer-lock" srcdoc>`;
 *   - `outro-site`: um iframe de OUTRO site (localhost × 127.0.0.1) que põe o documento num
 *     `srcdoc` interno com o mesmo sandbox (a "casca" do pacote B2);
 *   - `mesma-origem`: controle, um iframe da mesma origem sem sandbox (tem de travar junto).
 *
 * O filho ocupa a thread por `BLOQUEIO_MS` com trabalho síncrono que NÃO é laço instrumentável
 * (ordenar um vetor grande repetidas vezes dentro de uma função nativa). A página de fora mede:
 *   - o maior intervalo entre dois batimentos de um `setInterval` de 50 ms (o atraso do relógio);
 *   - quanto demora um clique de verdade num botão para ser atendido durante o bloqueio.
 *
 * Variáveis: `SZ_CHECK_CHROMIUM` (caminho do navegador), `SZ_MEASURE_BROWSERS` (lista separada por
 * vírgula entre chromium, firefox e webkit; padrão: chromium).
 */
import { createServer } from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const playwright = require('playwright-core')

const BLOQUEIO_MS = 5000
const SANDBOX = 'allow-scripts allow-modals allow-pointer-lock'

const FILHO = `<!doctype html><meta charset="utf-8"><body style="margin:0;font:14px sans-serif">prévia
<script>
addEventListener('message', (ev) => {
  if (ev.data !== 'travar') return
  const fim = performance.now() + ${BLOQUEIO_MS}
  const dados = Array.from({ length: 200000 }, (_, i) => (i * 7919) % 10007)
  // Trabalho síncrono dentro de chamadas nativas: nenhum laço do "aluno" para o guarda cortar.
  const gastar = () => (performance.now() < fim ? (dados.slice().sort((a, b) => a - b), gastar()) : 0)
  try { gastar() } catch { while (performance.now() < fim) dados.slice().sort((a, b) => a - b) }
  parent.postMessage('destravou', '*')
})
parent.postMessage('pronto', '*')
</script>`

/** A casca: recebe o documento por mensagem e o põe num srcdoc interno, repassando as mensagens. */
const CASCA = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="dentro" sandbox="${SANDBOX}" style="border:0;width:100%;height:100%"></iframe>
<script>
const dentro = document.getElementById('dentro')
addEventListener('message', (ev) => {
  if (ev.source === parent && ev.data && ev.data.doc) dentro.srcdoc = ev.data.doc
  else if (ev.source === parent) dentro.contentWindow.postMessage(ev.data, '*')
  else if (ev.source === dentro.contentWindow) parent.postMessage(ev.data, '*')
})
parent.postMessage('casca', '*')
</script>`

function pagina(arranjo, outraOrigem) {
  const quadro =
    arranjo === 'srcdoc'
      ? `<iframe id="previa" sandbox="${SANDBOX}"></iframe>`
      : arranjo === 'outro-site'
        ? `<iframe id="previa" src="${outraOrigem}/casca"></iframe>`
        : `<iframe id="previa" src="/filho"></iframe>`
  return `<!doctype html><meta charset="utf-8"><body>
<button id="botao">clicar</button> ${quadro}
<script>
const FILHO = ${JSON.stringify(FILHO).replaceAll('<', '\\u003c')}
const previa = document.getElementById('previa')
const estado = { pronto: false, destravou: false, maior: 0, cliques: [] }
window.estado = estado
let ultimo = performance.now()
let medindo = false
setInterval(() => {
  const agora = performance.now()
  if (medindo) estado.maior = Math.max(estado.maior, agora - ultimo)
  ultimo = agora
}, 50)
document.getElementById('botao').addEventListener('click', () => estado.cliques.push(performance.now()))
addEventListener('message', (ev) => {
  if (ev.data === 'casca') previa.contentWindow.postMessage({ doc: FILHO }, '*')
  if (ev.data === 'pronto') estado.pronto = true
  if (ev.data === 'destravou') { estado.maior = Math.max(estado.maior, performance.now() - ultimo); estado.destravou = true; medindo = false }
})
if (${JSON.stringify(arranjo)} === 'srcdoc') previa.srcdoc = FILHO
window.travar = () => { medindo = true; ultimo = performance.now(); estado.inicio = ultimo; previa.contentWindow.postMessage('travar', '*') }
</script>`
}

function servidor(comCabecalhos) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://x')
      const headers = { 'content-type': 'text/html; charset=utf-8' }
      if (comCabecalhos) {
        headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        headers['Cross-Origin-Embedder-Policy'] = 'credentialless'
        headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
      }
      res.writeHead(200, headers)
      if (url.pathname === '/filho') res.end(FILHO)
      else if (url.pathname === '/casca') res.end(CASCA)
      else
        res.end(
          pagina(url.searchParams.get('arranjo'), `http://localhost:${server.address().port}`),
        )
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

async function medir(browser, base, arranjo) {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } })
  if (process.env.SZ_MEASURE_DEBUG) {
    page.on('console', (m) => console.error('[pagina]', m.text()))
    page.on('pageerror', (e) => console.error('[erro]', String(e)))
  }
  try {
    await page.goto(`${base}/?arranjo=${arranjo}`)
    await page.waitForFunction(() => window.estado.pronto, undefined, { timeout: 15_000 })
    await page.waitForTimeout(300)
    await page.evaluate(() => window.travar())
    // Um clique de verdade 500 ms depois de o bloqueio começar: quanto tempo até ser atendido?
    await page.waitForTimeout(500).catch(() => {})
    const antes = Date.now()
    const caixa = await page.locator('#botao').boundingBox()
    await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2).catch(() => {})
    await page.waitForFunction(() => window.estado.cliques.length > 0, undefined, {
      timeout: BLOQUEIO_MS + 10_000,
    })
    const cliqueMs = Date.now() - antes
    await page.waitForFunction(() => window.estado.destravou, undefined, {
      timeout: BLOQUEIO_MS + 10_000,
    })
    const maior = await page.evaluate(() => Math.round(window.estado.maior))
    return {
      arranjo,
      maiorAtrasoDoRelogioMs: maior,
      cliqueAtendidoEmMs: cliqueMs,
      isolado: maior < 500,
    }
  } catch (erro) {
    const estado = await page.evaluate(() => JSON.stringify(window.estado)).catch(() => '?')
    throw new Error(`${String(erro.message).split('\n')[0]} · estado ${estado}`)
  } finally {
    await page.close()
  }
}

const nomes = (process.env.SZ_MEASURE_BROWSERS ?? 'chromium').split(',').map((n) => n.trim())
// Headless shell has different process isolation from the full Chromium browser. Measuring
// it by accident can turn a browser capability result into a property of the test harness.
const chromiumMode = process.env.SZ_CHECK_CHROMIUM
  ? 'explicit-executable'
  : process.env.SZ_MEASURE_HEADLESS_SHELL === '1'
    ? 'headless-shell'
    : 'chromium'
const saida = []
for (const nome of nomes) {
  let browser
  try {
    browser = await playwright[nome].launch({
      headless: true,
      ...(nome === 'chromium' && chromiumMode === 'chromium' ? { channel: 'chromium' } : {}),
      ...(nome === 'chromium' && process.env.SZ_CHECK_CHROMIUM
        ? { executablePath: process.env.SZ_CHECK_CHROMIUM }
        : {}),
    })
  } catch (erro) {
    saida.push({ navegador: nome, erro: `não abriu: ${String(erro.message).split('\n')[0]}` })
    continue
  }
  try {
    for (const comCabecalhos of [false, true]) {
      const server = await servidor(comCabecalhos)
      const base = `http://127.0.0.1:${server.address().port}`
      for (const arranjo of ['mesma-origem', 'srcdoc', 'outro-site']) {
        try {
          saida.push({
            navegador: `${nome} ${browser.version()}`,
            ...(nome === 'chromium' ? { chromiumMode } : {}),
            cabecalhosDoHost: comCabecalhos,
            ...(await medir(browser, base, arranjo)),
          })
        } catch (erro) {
          saida.push({
            navegador: nome,
            cabecalhosDoHost: comCabecalhos,
            arranjo,
            erro: String(erro.message).split('\n')[0],
          })
        }
      }
      server.close()
    }
  } finally {
    await browser.close()
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(saida, null, 1))
else console.table(saida)

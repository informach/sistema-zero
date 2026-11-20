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
 * `SZ_MEASURE_HOST_POLICY_SPLIT=1` separa COOP e COEP do host, mantendo na casca
 * os cabeçalhos reais. Sem essa opção, os dois perfis históricos não mudam.
 * `SZ_MEASURE_FIREFOX_SITE_ISOLATION=1` devolve ao Firefox o isolamento por site do navegador de
 * verdade: o Firefox do Playwright vem com `fission.webContentIsolationStrategy = 0` ("Disable
 * cross-process iframes", `browser_patches/firefox/preferences/playwright.cfg` do Playwright),
 * então ali um iframe de outro site roda no MESMO processo da página. O Firefox de mesa usa 1
 * (isolar todo site). Sem a opção, a medição segue com a preferência do Playwright, e cada linha
 * diz qual valeu (`isolamentoDoFirefox`).
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

// Positive control for thread isolation, not an implementation of the game engines.
// Transfer a real canvas and stop native synchronous work using Worker.terminate().
const CANVAS_WORKER = `
addEventListener('message', (event) => {
  if (event.data && (event.data.canvas || event.data.cpuOnly)) {
    let offscreen2D = false;
    try { offscreen2D = !!new OffscreenCanvas(8, 8).getContext('2d'); } catch {}
    postMessage({ capabilities: {
      offscreen2D, sharedArrayBufferAvailable: typeof SharedArrayBuffer === 'function',
      rafFunctionAvailable: typeof requestAnimationFrame === 'function',
    } });
  }
  if (event.data && event.data.canvas) {
    const context = event.data.canvas.getContext('2d');
    if (!context) { postMessage({ error: 'Canvas 2D indisponível' }); return; }
    context.fillStyle = '#159447'; context.fillRect(0, 0, 256, 128);
    postMessage('pronto');
  } else if (event.data && event.data.cpuOnly) {
    postMessage('pronto');
  } else if (event.data === 'travar') {
    postMessage('bloqueando');
    const end = performance.now() + ${BLOQUEIO_MS};
    const data = Array.from({ length: 200000 }, (_, i) => (i * 7919) % 10007);
    while (performance.now() < end) data.slice().sort((a, b) => a - b);
    postMessage('destravou');
  }
});`
const CANVAS_HOST = `<!doctype html><meta charset="utf-8"><body>
<button id="botao">clicar</button><canvas width="256" height="128"></canvas>
<script>
const estado = window.estado = { pronto: false, bloqueando: false, destravou: false,
  maior: 0, cliques: [], terminated: false, supported: true };
let previous = performance.now(), measuring = false;
const timer = setInterval(() => {
  const now = performance.now();
  if (measuring) estado.maior = Math.max(estado.maior, now - previous);
  previous = now;
}, 50);
let worker;
const cpuOnly = new URLSearchParams(location.search).has('cpu-only');
try {
  const canvas = document.querySelector('canvas');
  estado.hostCapabilities = {
    canvasTransferAvailable: typeof canvas.transferControlToOffscreen === 'function',
    crossOriginIsolated: globalThis.crossOriginIsolated,
    sharedArrayBufferAvailable: typeof SharedArrayBuffer === 'function',
  };
  if (!cpuOnly && !canvas.transferControlToOffscreen) throw Error('transferControlToOffscreen indisponível');
  worker = new Worker('/canvas-worker.js');
  worker.addEventListener('message', (event) => {
    if (event.data && event.data.capabilities) estado.workerCapabilities = event.data.capabilities;
    else if (event.data === 'pronto') estado.pronto = true;
    else if (event.data === 'bloqueando') estado.bloqueando = true;
    else if (event.data === 'destravou') estado.destravou = true;
    else if (event.data && event.data.error) estado.error = event.data.error;
  });
  worker.addEventListener('error', (event) => { estado.error = event.message; });
  if (cpuOnly) worker.postMessage({ cpuOnly: true });
  else {
    const surface = canvas.transferControlToOffscreen();
    worker.postMessage({ canvas: surface }, [surface]);
  }
} catch (error) { estado.supported = false; estado.error = error.message; }
document.getElementById('botao').addEventListener('click', () => {
  estado.cliques.push(performance.now());
  const before = performance.now(); worker.terminate();
  estado.stopMs = performance.now() - before;
  estado.terminated = true; estado.finishedBeforeStop = estado.destravou;
  estado.maior = Math.max(estado.maior, performance.now() - previous);
  measuring = false; clearInterval(timer);
});
window.travar = () => { measuring = true; previous = performance.now(); worker.postMessage('travar'); };
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

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'cross-origin',
}
// Optional causal experiment: the actual shell always sends its isolation
// headers, while course pages cannot enable COEP without qualifying their videos.
const splitHostPolicies = process.env.SZ_MEASURE_HOST_POLICY_SPLIT === '1'
const headerProfiles = splitHostPolicies
  ? [
      { name: 'none', host: {}, frame: isolationHeaders },
      {
        name: 'coop',
        host: { 'Cross-Origin-Opener-Policy': 'same-origin' },
        frame: isolationHeaders,
      },
      {
        name: 'coep',
        host: { 'Cross-Origin-Embedder-Policy': 'credentialless' },
        frame: isolationHeaders,
      },
      { name: 'coop-coep', host: isolationHeaders, frame: isolationHeaders },
    ]
  : [
      { name: 'none', host: {}, frame: {} },
      { name: 'coop-coep', host: isolationHeaders, frame: isolationHeaders },
    ]

function servidor(profile) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://x')
      const headers = {
        'content-type':
          url.pathname === '/canvas-worker.js'
            ? 'text/javascript; charset=utf-8'
            : 'text/html; charset=utf-8',
      }
      Object.assign(
        headers,
        ['/casca', '/filho'].includes(url.pathname) ? profile.frame : profile.host,
      )
      res.writeHead(200, headers)
      if (url.pathname === '/canvas-worker.js') res.end(CANVAS_WORKER)
      else if (url.pathname === '/canvas-host') res.end(CANVAS_HOST)
      else if (url.pathname === '/filho') res.end(FILHO)
      else if (url.pathname === '/casca') res.end(CASCA)
      else
        res.end(
          pagina(url.searchParams.get('arranjo'), `http://localhost:${server.address().port}`),
        )
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

/** Identical native input path for iframe and Worker controls (no locator.click waits). */
async function medirClique(page) {
  const before = Date.now()
  const box = await page.locator('#botao').boundingBox()
  if (!box) throw new Error('O botão da medição não está visível')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForFunction(() => window.estado.cliques.length > 0, undefined, {
    timeout: BLOQUEIO_MS + 10_000,
  })
  return Date.now() - before
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
    const cliqueMs = await medirClique(page)
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

async function medirWorker(browser, base, canvas = true) {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } })
  try {
    await page.goto(`${base}/canvas-host${canvas ? '' : '?cpu-only=1'}`)
    await page.waitForFunction(() => window.estado.pronto || window.estado.error)
    const ready = await page.evaluate(() => ({ ...window.estado }))
    if (ready.error) return { arranjo: canvas ? 'worker-canvas' : 'worker-cpu', ...ready }
    await page.waitForTimeout(300) // Same explicit warmup as the iframe controls.
    await page.evaluate(() => window.travar())
    await page.waitForFunction(() => window.estado.bloqueando)
    await page.waitForTimeout(500)
    const clickMs = await medirClique(page)
    const value = await page.evaluate(() => ({ ...window.estado }))
    return {
      arranjo: canvas ? 'worker-canvas' : 'worker-cpu',
      supported: value.supported,
      maiorAtrasoDoRelogioMs: Math.round(value.maior),
      cliqueAtendidoEmMs: clickMs,
      hostCapabilities: value.hostCapabilities,
      workerCapabilities: value.workerCapabilities,
      terminated: value.terminated,
      stopCallMs: value.stopMs,
      workerFinishedBeforeStop: value.finishedBeforeStop,
      isolado: value.terminated && !value.finishedBeforeStop && value.maior < 500 && clickMs < 500,
      scope: canvas
        ? 'synthetic-native-sort-and-canvas; not-game-engine-qualification'
        : 'cpu-only-control; not-rendering-or-game-engine-qualification',
    }
  } finally {
    await page.close()
  }
}
const allowedArrangements = ['mesma-origem', 'srcdoc', 'outro-site', 'worker-canvas', 'worker-cpu']
const arrangements = (process.env.SZ_MEASURE_ARRANGEMENTS ?? allowedArrangements.join(','))
  .split(',')
  .map((value) => value.trim())
if (!arrangements.length || arrangements.some((value) => !allowedArrangements.includes(value)))
  throw new Error('Arranjo de medição desconhecido')

const nomes = (process.env.SZ_MEASURE_BROWSERS ?? 'chromium').split(',').map((n) => n.trim())
// Headless shell has different process isolation from the full Chromium browser. Measuring
// it by accident can turn a browser capability result into a property of the test harness.
const chromiumMode = process.env.SZ_CHECK_CHROMIUM
  ? 'explicit-executable'
  : process.env.SZ_MEASURE_HEADLESS_SHELL === '1'
    ? 'headless-shell'
    : 'chromium'
const firefoxSiteIsolation = process.env.SZ_MEASURE_FIREFOX_SITE_ISOLATION === '1'
const saida = []
for (const nome of nomes) {
  let browser
  try {
    browser = await playwright[nome].launch({
      headless: true,
      ...(nome === 'firefox' && firefoxSiteIsolation
        ? { firefoxUserPrefs: { 'fission.webContentIsolationStrategy': 1 } }
        : {}),
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
    for (const profile of headerProfiles) {
      const server = await servidor(profile)
      const base = `http://127.0.0.1:${server.address().port}`
      for (const arranjo of arrangements) {
        try {
          saida.push({
            navegador: `${nome} ${browser.version()}`,
            ...(nome === 'chromium' ? { chromiumMode } : {}),
            ...(nome === 'firefox'
              ? {
                  isolamentoDoFirefox: firefoxSiteIsolation
                    ? 'por site (1, o do Firefox de mesa)'
                    : 'do Playwright (0, iframes no mesmo processo)',
                }
              : {}),
            cabecalhosDoHost: Object.keys(profile.host).length > 0,
            ...(splitHostPolicies
              ? {
                  perfilDoHost: profile.name,
                  hostHeaders: profile.host,
                  frameHeaders: profile.frame,
                }
              : {}),
            ...(['worker-canvas', 'worker-cpu'].includes(arranjo)
              ? await medirWorker(browser, base, arranjo === 'worker-canvas')
              : await medir(browser, base, arranjo)),
          })
        } catch (erro) {
          saida.push({
            navegador: nome,
            cabecalhosDoHost: Object.keys(profile.host).length > 0,
            ...(splitHostPolicies
              ? {
                  perfilDoHost: profile.name,
                  hostHeaders: profile.host,
                  frameHeaders: profile.frame,
                }
              : {}),
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

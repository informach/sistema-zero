import {
  asset3DManifest,
  assetManifest,
  assetMetaManifest,
  type Project,
  soundManifest,
} from '#core'
import { type ExtensionPermission, loadExtensionBootstrapScripts } from '#extensions'
import { findExtension } from '#official-extensions'
import { buildPreviewDoc, withCoreImports } from '#preview'

/**
 * Captura uma CAPA (print PNG) do projeto RODANDO, para a vitrine "Mural dos
 * Criadores". Reusa o mesmo isolamento das checagens de atividade: roda o
 * programa do aluno num iframe via `buildPreviewDoc` (sandbox SEM
 * `allow-same-origin` + CSP + guardas), injeta um harness que fotografa e posta
 * a imagem ao parent (autenticada por `ev.source === iframe.contentWindow`).
 *
 * DUAS passadas (o print é a 1ª opção; só cai p/ capa do admin/upload em último
 * caso — decisão da usuária):
 *  1. **Canvas** — lê o MAIOR `<canvas>` com `toDataURL` (jogos 2D/3D). Rápido e
 *     exato; mantém o pipeline atual sem mexer no `needsModules` dos jogos.
 *  2. **DOM (html2canvas)** — só se a passada 1 voltar `null` (projeto sem canvas:
 *     páginas HTML/CSS). Rasteriza o `document.body` com o html2canvas carregado do
 *     CDN (esm.sh) DENTRO do iframe — o pai não acessa o sandbox null-origin, então
 *     a rasterização precisa rodar lá. Mesmo padrão do `three` do Jogo 3D
 *     (`extensionImports` → importmap + origem liberada no `script-src` da CSP).
 *
 * Canvas "tainted" (imagem cross-origin sem CORS), timeout, ou fora do browser →
 * `null` (o chamador cai na capa do admin / upload). NUNCA lança.
 */
export interface CaptureCoverOptions {
  /** Espera (ms) após o `load` antes de fotografar — deixa o jogo desenhar. Default 1500. */
  warmupMs?: number
  /** Teto total da operação (ms). Default `warmupMs + 4000`. */
  timeoutMs?: number
  /** Origens liberadas pelo professor (espelha o sandbox de atividade). */
  fetchAllowedOrigins?: readonly string[]
  loopBudgetMs?: number
}

const DEFAULT_WARMUP_MS = 1_500
/** Teto do data URL aceito (~6 MB) — defesa contra payload absurdo; o BFF re-encoda. */
const MAX_DATA_URL_BYTES = 6_000_000
/** html2canvas (UMD/ESM) pinado no esm.sh — carregado SÓ na passada DOM (projeto sem canvas). */
const HTML2CANVAS_URL = 'https://esm.sh/html2canvas@1.4.1'

/** Contexto de extensão do projeto (scripts/imports/permissões) p/ o `buildPreviewDoc`. */
async function extensionContext(project: Project): Promise<{
  extensionScripts: string[]
  extensionImports: Record<string, string>
  permissions: ExtensionPermission[]
}> {
  const ids = project.installedExtensions.map((e) => e.id)
  const extensions = ids.flatMap((id) => {
    const extension = findExtension(id)
    return extension ? [extension] : []
  })
  const extensionScripts = await loadExtensionBootstrapScripts(extensions)
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const id of ids) {
    const ext = findExtension(id)
    if (!ext) continue
    if (ext.runtime.esmImports) Object.assign(extensionImports, ext.runtime.esmImports)
    for (const p of ext.manifest.permissions) permissions.add(p)
  }
  return { extensionScripts, extensionImports, permissions: Array.from(permissions) }
}

/**
 * Roda UMA passada de captura: monta o doc do preview com o `harness` (vai por
 * ÚLTIMO, depois das extensões e do aluno), abre um iframe imperceptível na
 * viewport e resolve o data URL postado pelo harness (ou `null` em timeout).
 */
async function runCapture(
  project: Project,
  opts: CaptureCoverOptions,
  harness: string,
  extraImports: Record<string, string>,
): Promise<string | null> {
  const ctx = await extensionContext(project)
  const parentOrigin = window.location.origin
  const warmupMs = opts.warmupMs ?? DEFAULT_WARMUP_MS
  const timeoutMs = opts.timeoutMs ?? warmupMs + 4_000
  const doc = buildPreviewDoc({
    html: project.files['index.html'] ?? '',
    css: project.files['style.css'] ?? '',
    js: project.files['script.js'] ?? '',
    // O harness vai POR ÚLTIMO: roda no `load`, depois das extensões e do aluno.
    extensionScripts: [...ctx.extensionScripts, harness],
    extraFiles: project.extraFiles,
    // Sem o manifesto, um jogo com imagem cairia no placeholder fillRect e a capa
    // sairia sem os sprites — semeamos os assets também na captura.
    assets: assetManifest(project.assets),
    assetsMeta: assetMetaManifest(project.assets),
    sounds: soundManifest(project.assets),
    models3d: asset3DManifest(project.assets),
    parentOrigin,
    installedPermissions: ctx.permissions,
    fetchAllowedOrigins: opts.fetchAllowedOrigins,
    loopBudgetMs: opts.loopBudgetMs,
    // `extraImports` (ex.: html2canvas) entram no importmap E liberam apenas a
    // URL/prefixo do pacote pinado no `script-src` da CSP do iframe.
    extensionImports: withCoreImports(
      { ...ctx.extensionImports, ...extraImports },
      project.files['script.js'],
    ),
  })

  return new Promise<string | null>((resolve) => {
    const iframe = document.createElement('iframe')
    // SEM `allow-modals` (igual ao runner de checagem): um `alert/confirm/prompt` do
    // projeto travaria a captura no iframe oculto até o timeout → capa `null` à toa.
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('aria-hidden', 'true')
    // ⚠️ NÃO usar `visibility:hidden`/`display:none`/off-screen: o navegador PARA o
    // `requestAnimationFrame` de iframes não renderizados/fora da viewport — o jogo
    // (loop em rAF) nunca desenha e a captura volta vazia/expira (bug do "sem foto"
    // nos jogos 2D). Mantemos o iframe DENTRO da viewport, porém imperceptível:
    // `opacity:0` ainda é COMPOSTO (rAF roda), diferente de visibility/display.
    iframe.style.position = 'fixed'
    iframe.style.left = '0'
    iframe.style.top = '0'
    iframe.style.width = '1024px'
    iframe.style.height = '768px'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-1'

    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const finish = (value: string | null) => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      iframe.remove()
      resolve(value)
    }

    const onMessage = (ev: MessageEvent) => {
      if (!iframe.contentWindow || ev.source !== iframe.contentWindow) return
      if (ev.origin !== 'null' && ev.origin !== parentOrigin) return
      const data = ev.data as { __szCover?: boolean; dataUrl?: unknown } | null
      if (data?.__szCover !== true) return
      const url = data.dataUrl
      finish(
        typeof url === 'string' &&
          url.startsWith('data:image/png') &&
          url.length <= MAX_DATA_URL_BYTES
          ? url
          : null,
      )
    }

    window.addEventListener('message', onMessage)
    // Timeout → null (cai na próxima passada / capa do admin). O warmup já está no harness.
    timer = setTimeout(() => finish(null), timeoutMs)
    iframe.srcdoc = doc
    document.body.appendChild(iframe)
  })
}

export async function captureCoverFromProject(
  project: Project,
  opts: CaptureCoverOptions = {},
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const parentOrigin = window.location.origin
  const warmupMs = opts.warmupMs ?? DEFAULT_WARMUP_MS

  // 1ª passada: canvas (jogos). Pipeline atual, sem html2canvas (não muda módulos).
  const canvasUrl = await runCapture(
    project,
    opts,
    buildCanvasHarness({ parentOrigin, warmupMs, maxBytes: MAX_DATA_URL_BYTES }),
    {},
  )
  if (canvasUrl) return canvasUrl

  // 2ª passada (só projetos sem canvas — HTML/CSS): html2canvas rasteriza o DOM.
  // Warmup curto: a página é estática; o teto evita esperar à toa pelo html2canvas.
  const domWarmup = Math.min(warmupMs, 600)
  return runCapture(
    project,
    { ...opts, warmupMs: domWarmup, timeoutMs: domWarmup + 6_000 },
    buildDomHarness({ parentOrigin, warmupMs: domWarmup, maxBytes: MAX_DATA_URL_BYTES }),
    { html2canvas: HTML2CANVAS_URL },
  )
}

/**
 * Harness de captura por CANVAS (STRING pura injetada no sandbox — sem imports,
 * sem refs externas). Roda no `load`, espera `warmupMs` (o jogo desenha), pega o
 * MAIOR canvas, COMPÕE o fundo do palco (que é CSS, não pixel) e posta o PNG ao
 * parent com `targetOrigin`.
 *
 * Exportado só para o teste, que avalia esta string com um `window`/`document`
 * falsos (mesmo padrão dos testes de runtime das extensões).
 */
export function buildCanvasHarness(opts: {
  parentOrigin: string
  warmupMs: number
  maxBytes: number
}): string {
  const origin = JSON.stringify(opts.parentOrigin)
  const warmup = Math.max(0, Math.floor(opts.warmupMs))
  const maxBytes = Math.max(0, Math.floor(opts.maxBytes))
  return `;(function(){
  var PARENT_ORIGIN = ${origin};
  var WARMUP = ${warmup};
  var MAX = ${maxBytes};
  function post(dataUrl){ try { parent.postMessage({ __szCover: true, dataUrl: dataUrl }, PARENT_ORIGIN); } catch (e) {} }
  function pick(){
    var list = document.querySelectorAll('canvas');
    var best = null, bestArea = -1;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var area = (c.width || 0) * (c.height || 0);
      if (area > bestArea) { best = c; bestArea = area; }
    }
    return best;
  }
  function bgOf(el){
    try {
      if (!el || !window.getComputedStyle) return '';
      var cor = window.getComputedStyle(el).backgroundColor;
      if (!cor || cor === 'transparent') return '';
      if (cor.indexOf('rgba') === 0) {
        var partes = cor.slice(cor.indexOf('(') + 1, cor.lastIndexOf(')')).split(',');
        if (partes.length > 3 && parseFloat(partes[3]) === 0) return '';
      }
      return cor;
    } catch (e) { return ''; }
  }
  function capture(){
    try {
      var c = pick();
      if (!c || !c.width || !c.height) { post(null); return; }
      // Copia para um canvas NOSSO antes de exportar. O fundo do palco e CSS
      // (style.background do canvas e do body), NUNCA pixel: o buffer do jogo tem
      // so os desenhos, sobre transparente. Exportar o canvas cru manda um PNG sem
      // o fundo, e a miniatura do card (JPEG, que nao tem alfa) achata isso para
      // PRETO. A copia tambem funciona para canvas WebGL.
      var tmp = document.createElement('canvas');
      tmp.width = c.width; tmp.height = c.height;
      var ctx = tmp.getContext('2d');
      if (!ctx) { post(null); return; }
      ctx.drawImage(c, 0, 0);
      // Quadro EM BRANCO nao vira capa: posta null para a passada do DOM
      // (html2canvas) assumir, que rasteriza o CSS e portanto enxerga o fundo.
      // Cobre o jogo que ainda nao desenhou e o 3D cujo buffer WebGL ja foi
      // descartado (sem preserveDrawingBuffer, ler fora do rAF volta vazio).
      // Nao da para inspecionar (canvas contaminado)? Nao descarta por isso — o
      // toDataURL logo abaixo lanca no mesmo caso e cai no catch.
      try {
        var d = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
        var pintado = false;
        for (var i = 3; i < d.length; i += 4) { if (d[i] !== 0) { pintado = true; break; } }
        if (!pintado) { post(null); return; }
      } catch (e) {}
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = bgOf(c) || bgOf(document.body) || '#ffffff';
      ctx.fillRect(0, 0, tmp.width, tmp.height);
      var url = tmp.toDataURL('image/png');
      if (typeof url !== 'string' || url.indexOf('data:image/png') !== 0 || url.length > MAX) { post(null); return; }
      post(url);
    } catch (e) { post(null); }
  }
  var done = false;
  function captureOnce(){ if (done) return; done = true; capture(); }
  function schedule(){
    // O rAF é o caminho BOM (fotografa logo depois de um quadro pintado), mas ele
    // NÃO dispara em aba de fundo nem numa página que está saindo — e é
    // exatamente aí que a capa mais importa (a criança volta pela navegação do
    // host ou fecha a aba). Sem a rede do setTimeout, a captura ficava pendurada
    // até o timeout e a capa saía nula em silêncio. Quem chegar primeiro vence.
    setTimeout(function(){
      if (window.requestAnimationFrame) window.requestAnimationFrame(captureOnce);
      setTimeout(captureOnce, 200);
    }, WARMUP);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();`
}

/**
 * Harness de captura por DOM (html2canvas) — injetado como MÓDULO (há
 * `extensionImports`, então `buildPreviewDoc` o emite `type="module"`): usa
 * `import('html2canvas')` (resolvido pelo importmap → esm.sh) e rasteriza o
 * `document.body`. Para projetos SEM canvas. Falha/timeout → posta `null`.
 */
function buildDomHarness(opts: {
  parentOrigin: string
  warmupMs: number
  maxBytes: number
}): string {
  const origin = JSON.stringify(opts.parentOrigin)
  const warmup = Math.max(0, Math.floor(opts.warmupMs))
  const maxBytes = Math.max(0, Math.floor(opts.maxBytes))
  return `;(function(){
  var PARENT_ORIGIN = ${origin};
  var WARMUP = ${warmup};
  var MAX = ${maxBytes};
  function post(dataUrl){ try { parent.postMessage({ __szCover: true, dataUrl: dataUrl }, PARENT_ORIGIN); } catch (e) {} }
  async function capture(){
    try {
      var mod = await import('html2canvas');
      var h2c = mod && (mod.default || mod);
      if (typeof h2c !== 'function') { post(null); return; }
      var body = document.body;
      var w = Math.min(Math.max(body.scrollWidth || 1024, 320), 1600);
      var h = Math.min(Math.max(body.scrollHeight || 768, 240), 1200);
      var canvas = await h2c(body, {
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        scale: 1,
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
      });
      var url = canvas.toDataURL('image/png');
      if (typeof url !== 'string' || url.indexOf('data:image/png') !== 0 || url.length > MAX) { post(null); return; }
      post(url);
    } catch (e) { post(null); }
  }
  function schedule(){ setTimeout(function(){ capture(); }, WARMUP); }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();`
}

import { assetManifest, type Project } from '#core'
import type { ExtensionPermission } from '#extensions'
import { findExtension } from '#official-extensions'
import { buildPreviewDoc } from '#preview'

/**
 * Captura uma CAPA (print PNG) do projeto RODANDO, para a vitrine "Mural dos
 * Criadores". Reusa exatamente o mesmo isolamento das checagens de atividade
 * (`runSandboxChecks`): roda o programa do aluno num iframe OCULTO via
 * `buildPreviewDoc` (sandbox SEM `allow-same-origin` + CSP + guardas), injeta um
 * harness que — depois de alguns frames — lê o MAIOR `<canvas>` com `toDataURL` e
 * posta a imagem ao parent (autenticada por `ev.source === iframe.contentWindow`).
 *
 * Só funciona para projetos baseados em CANVAS (jogos 2D/3D). Projeto sem canvas,
 * canvas "tainted" (imagem cross-origin sem CORS), timeout, ou fora do browser →
 * `null` (o chamador cai na capa padrão do admin). NUNCA lança.
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

export async function captureCoverFromProject(
  project: Project,
  opts: CaptureCoverOptions = {},
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const ids = project.installedExtensions.map((e) => e.id)
  const extensionScripts = ids
    .map((id) => findExtension(id)?.runtime.bootstrapScript)
    .filter((s): s is string => Boolean(s))
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const id of ids) {
    const ext = findExtension(id)
    if (!ext) continue
    if (ext.runtime.esmImports) Object.assign(extensionImports, ext.runtime.esmImports)
    for (const p of ext.manifest.permissions) permissions.add(p)
  }

  const parentOrigin = window.location.origin
  const warmupMs = opts.warmupMs ?? DEFAULT_WARMUP_MS
  const timeoutMs = opts.timeoutMs ?? warmupMs + 4_000
  const harness = buildCoverHarness({ parentOrigin, warmupMs, maxBytes: MAX_DATA_URL_BYTES })
  const doc = buildPreviewDoc({
    html: project.files['index.html'] ?? '',
    css: project.files['style.css'] ?? '',
    js: project.files['script.js'] ?? '',
    // O harness vai POR ÚLTIMO: roda no `load`, depois das extensões e do aluno.
    extensionScripts: [...extensionScripts, harness],
    extraFiles: project.extraFiles,
    // Sem o manifesto, um jogo com imagem cairia no placeholder fillRect e a capa
    // sairia sem os sprites — semeamos os assets também na captura.
    assets: assetManifest(project.assets),
    parentOrigin,
    installedPermissions: Array.from(permissions),
    fetchAllowedOrigins: opts.fetchAllowedOrigins,
    loopBudgetMs: opts.loopBudgetMs,
    extensionImports,
  })

  return new Promise<string | null>((resolve) => {
    const iframe = document.createElement('iframe')
    // SEM `allow-modals` (igual ao runner de checagem): um `alert/confirm/prompt` do
    // projeto travaria a captura no iframe oculto até o timeout → capa `null` à toa.
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'absolute'
    iframe.style.width = '1024px'
    iframe.style.height = '768px'
    iframe.style.left = '-99999px'
    iframe.style.top = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'

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
    // Timeout → null (cai na capa padrão). O warmup já está embutido no harness.
    timer = setTimeout(() => finish(null), timeoutMs)
    iframe.srcdoc = doc
    document.body.appendChild(iframe)
  })
}

/**
 * Harness de captura (STRING pura injetada no sandbox — sem imports, sem refs
 * externas, como o `buildCheckHarness`). Roda no `load`, espera `warmupMs` (o jogo
 * desenha), pega o MAIOR canvas e posta o PNG ao parent com `targetOrigin`.
 */
function buildCoverHarness(opts: {
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
  function capture(){
    try {
      var c = pick();
      if (!c || !c.width || !c.height) { post(null); return; }
      var url = c.toDataURL('image/png');
      if (typeof url !== 'string' || url.indexOf('data:image/png') !== 0 || url.length > MAX) { post(null); return; }
      post(url);
    } catch (e) { post(null); }
  }
  function schedule(){
    setTimeout(function(){ (window.requestAnimationFrame || window.setTimeout)(capture); }, WARMUP);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();`
}

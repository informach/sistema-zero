/**
 * Runtime injetado no `<head>` do iframe (ANTES dos runtimes de extensão e do
 * código do aluno) que semeia o MANIFESTO de assets do projeto em
 * `window.__SZGAME_ASSETS = { nome: dataUrl }`.
 *
 * Porquê: os blocos de imagem do game-2d referenciam um asset pelo NOME (string);
 * o runtime (`SZGame2D.loadImage('heroi')`) resolve esse nome no manifesto e cria
 * `new Image()` com o `data:` URL. As imagens vivem embutidas no projeto (offline,
 * sem servidor) e passam na CSP do preview (`img-src data:`) sem precisar da
 * permission `network` — `new Image().src = dataUrl` é um subrecurso PASSIVO, não
 * um `connect-src`.
 *
 * Espelha o `storageBridge`: semeadura ONE-WAY via srcdoc (sem `postMessage`, sem
 * `targetOrigin`), conteúdo via `JSON.parse('...')` (NÃO objeto literal — evita o
 * gotcha de `__proto__`), STRING pura (entra num `<script>`): sem imports nem refs
 * externas. O escape de `</script` fica por conta do `escapeScriptContent` do
 * bootstrap (este runtime é emitido via `scriptTag`, igual ao storageBridge).
 */

import { PROJECT_ASSET_LIMITS, type ProjectTilemapMeta } from '#core'

const ASSET_DATA_URL_PREFIX = 'data:image/'

/** Entrada de metadado de preview de UM asset (hoje só `tilemap`). */
export interface AssetPreviewMeta {
  tilemap?: ProjectTilemapMeta
}

/**
 * Filtra o manifesto de METADADOS (defesa em profundidade, espelho do
 * `sanitizeTilemapMeta`): só entra nome que EXISTE no manifesto de assets
 * (meta nunca sem imagem) com um `tilemap` dentro dos tetos. Orçamento próprio
 * de chars para o srcdoc não inchar.
 */
function safeMetaManifest(
  meta: Record<string, AssetPreviewMeta>,
  safeAssets: Record<string, string>,
): Record<string, AssetPreviewMeta> {
  // null-proto: atribuir uma chave literal `__proto__` cria chave PRÓPRIA em vez
  // de silenciosamente setar o protótipo (e sumir do JSON.stringify).
  const out: Record<string, AssetPreviewMeta> = Object.create(null)
  let totalChars = 0
  for (const [name, entry] of Object.entries(meta)) {
    if (!Object.hasOwn(safeAssets, name)) continue
    const tilemap = entry?.tilemap
    if (!tilemap || typeof tilemap !== 'object') continue
    const sheet = tilemap.tileset?.dataUrl
    if (
      typeof sheet !== 'string' ||
      !sheet.startsWith(ASSET_DATA_URL_PREFIX) ||
      sheet.length > PROJECT_ASSET_LIMITS.maxTilemapSheetChars
    ) {
      continue
    }
    if (
      typeof tilemap.grid !== 'string' ||
      tilemap.grid.length > PROJECT_ASSET_LIMITS.maxTilemapGridChars
    ) {
      continue
    }
    const size = sheet.length + tilemap.grid.length + name.length
    if (totalChars + size > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) continue
    totalChars += size
    out[name] = { tilemap }
  }
  return out
}

/**
 * Constrói o `<script>` (string) que define `window.__SZGAME_ASSETS`. Filtra para
 * só aceitar valores `data:image/...` — defesa em profundidade caso um chamador
 * passe um manifesto não saneado — e CLAMPA quantidade + total de caracteres
 * (espelha `sanitizeProjectAssets` em core/project.ts via `PROJECT_ASSET_LIMITS`)
 * para que um manifesto exagerado não inche o srcdoc. Este é o ponto único do
 * preview ao vivo + export + capa + atividade, então o teto vale para todos.
 *
 * 2º parâmetro OPCIONAL (`meta`): manifesto de METADADOS de preview
 * (`assetMetaManifest` do core) semeado em `window.__SZGAME_ASSET_META` no MESMO
 * script — o bloco "Criar mapa do meu desenho" monta o mapa a partir dele.
 * Sem meta, a saída é BYTE-IDÊNTICA à assinatura antiga (docs de projetos sem
 * mapa não mudam — retrocompat e caches preservados).
 */
export function buildAssetsRuntime(
  assets: Record<string, string> = {},
  meta: Record<string, AssetPreviewMeta> = {},
): string {
  // null-proto: um nome literal `__proto__` vira chave própria (nunca protótipo).
  const safe: Record<string, string> = Object.create(null)
  let count = 0
  let totalChars = 0
  for (const [name, url] of Object.entries(assets)) {
    if (count >= PROJECT_ASSET_LIMITS.maxAssetsCount) break
    if (
      typeof name === 'string' &&
      typeof url === 'string' &&
      url.startsWith(ASSET_DATA_URL_PREFIX)
    ) {
      // Conta nome + dataUrl no orçamento total; pula o que estouraria (sem cortar
      // um dataUrl ao meio — uma imagem truncada não decodificaria de qualquer jeito).
      if (totalChars + name.length + url.length > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) continue
      safe[name] = url
      totalChars += name.length + url.length
      count++
    }
  }
  // Doubly-encoded: o seed entra como STRING JSON + JSON.parse em runtime (não como
  // objeto literal), criando chaves PRÓPRIAS mesmo para um nome literal `__proto__`
  // (que num literal redefiniria o protótipo). Idêntico ao storageBridge.
  const seedLiteral = JSON.stringify(JSON.stringify(safe))
  const safeMeta = safeMetaManifest(meta, safe)
  const metaBlock =
    Object.keys(safeMeta).length > 0
      ? `
  var META;
  try { META = JSON.parse(${JSON.stringify(JSON.stringify(safeMeta))}); } catch (e) { META = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_ASSET_META', { value: META, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_ASSET_META = META; } catch (e2) {}
  }`
      : ''
  return `(function () {
  var ASSETS;
  try { ASSETS = JSON.parse(${seedLiteral}); } catch (e) { ASSETS = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_ASSETS', { value: ASSETS, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_ASSETS = ASSETS; } catch (e2) {}
  }${metaBlock}
})();`
}

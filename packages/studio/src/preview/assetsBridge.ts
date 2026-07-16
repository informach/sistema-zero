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

import { type Asset3DManifestEntry, PROJECT_ASSET_LIMITS, type ProjectTilemapMeta } from '#core'

const ASSET_DATA_URL_PREFIX = 'data:image/'
const AUDIO_DATA_URL_PREFIX = 'data:audio/'
/** Prefixo esperado por kind 3D — espelha ASSET_3D_SPECS do core. */
const ASSET_3D_PREFIX: Record<Asset3DManifestEntry['kind'], string> = {
  model3d: 'data:model/gltf-binary',
  environment3d: 'data:image/vnd.radiance',
}

/**
 * Clampa o manifesto 3D. Irmão do `clampManifest`, mas cada entrada é um OBJETO
 * ({kind, dataUrl, fileName}) e o prefixo válido depende do `kind` — por isso não
 * dá para reusar o de string. Mesmos tetos de quantidade/total.
 */
function clamp3DManifest(
  entries: Record<string, Asset3DManifestEntry>,
): Record<string, Asset3DManifestEntry> {
  const safe: Record<string, Asset3DManifestEntry> = Object.create(null)
  let count = 0
  let totalChars = 0
  for (const [name, entry] of Object.entries(entries)) {
    if (count >= PROJECT_ASSET_LIMITS.maxAssetsCount) break
    if (typeof name !== 'string' || !entry || typeof entry !== 'object') continue
    const prefix = ASSET_3D_PREFIX[entry.kind]
    if (!prefix || typeof entry.dataUrl !== 'string' || !entry.dataUrl.startsWith(prefix)) continue
    if (
      totalChars + name.length + entry.dataUrl.length >
      PROJECT_ASSET_LIMITS.maxAssetsTotalChars
    ) {
      continue
    }
    safe[name] = {
      kind: entry.kind,
      dataUrl: entry.dataUrl,
      fileName: String(entry.fileName ?? ''),
    }
    totalChars += name.length + entry.dataUrl.length
    count++
  }
  return safe
}

/**
 * Clampa um manifesto `nome → dataUrl` a chaves próprias (null-proto anti-`__proto__`),
 * ao prefixo esperado e aos tetos de quantidade/total — espelha `sanitizeProjectAssets`.
 * Usado tanto para imagens (`data:image/`) quanto para sons (`data:audio/`).
 */
function clampManifest(entries: Record<string, string>, prefix: string): Record<string, string> {
  const safe: Record<string, string> = Object.create(null)
  let count = 0
  let totalChars = 0
  for (const [name, url] of Object.entries(entries)) {
    if (count >= PROJECT_ASSET_LIMITS.maxAssetsCount) break
    if (typeof name === 'string' && typeof url === 'string' && url.startsWith(prefix)) {
      if (totalChars + name.length + url.length > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) continue
      safe[name] = url
      totalChars += name.length + url.length
      count++
    }
  }
  return safe
}

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
 * 3º parâmetro OPCIONAL (`sounds`): manifesto `nome → dataUrl` de ÁUDIO
 * (`soundManifest` do core) semeado em `window.__SZGAME_SOUNDS` — o runtime toca
 * com `new Audio(dataUrl)` (a CSP libera `media-src data:`). Sem meta E sem sons,
 * a saída é BYTE-IDÊNTICA à assinatura antiga (retrocompat e caches preservados).
 */
export function buildAssetsRuntime(
  assets: Record<string, string> = {},
  meta: Record<string, AssetPreviewMeta> = {},
  sounds: Record<string, string> = {},
  models3d: Record<string, Asset3DManifestEntry> = {},
): string {
  const safe = clampManifest(assets, ASSET_DATA_URL_PREFIX)
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
  const safeSounds = clampManifest(sounds, AUDIO_DATA_URL_PREFIX)
  const soundsBlock =
    Object.keys(safeSounds).length > 0
      ? `
  var SOUNDS;
  try { SOUNDS = JSON.parse(${JSON.stringify(JSON.stringify(safeSounds))}); } catch (e) { SOUNDS = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_SOUNDS', { value: SOUNDS, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_SOUNDS = SOUNDS; } catch (e2) {}
  }`
      : ''
  // Binários 3D (modelo GLB / céu HDR). Canal PRÓPRIO porque o `clampManifest`
  // dos outros filtra por prefixo `data:image/`/`data:audio/` e descartaria um
  // `data:model/gltf-binary` em silêncio. Cada entrada leva o `kind` junto: o
  // runtime escolhe o loader (GLTFLoader × RGBELoader) e carrega por `.parse()`
  // de um ArrayBuffer — NUNCA por fetch (a rede é bloqueada no preview).
  const safe3D = clamp3DManifest(models3d)
  const models3dBlock =
    Object.keys(safe3D).length > 0
      ? `
  var MODELS3D;
  try { MODELS3D = JSON.parse(${JSON.stringify(JSON.stringify(safe3D))}); } catch (e) { MODELS3D = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_ASSETS_3D', { value: MODELS3D, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_ASSETS_3D = MODELS3D; } catch (e2) {}
  }`
      : ''
  // Resolvedor LOCAL de assets do projeto para os loaders que usam fetch
  // (GLTFLoader→.glb, RGBELoader→.hdr passam por THREE.FileLoader→fetch). É a
  // ponte da categoria Canvas 3D: `carregador.load('modelo.glb', …)` — o código
  // REAL do three.js, idêntico ao que roda no deploy — não rodava no preview
  // porque a CSP `connect-src 'none'` barra todo fetch. Este shim NÃO abre a rede:
  // só devolve os bytes de um asset JÁ embutido na página (o manifesto 3D/imagens),
  // casando pelo NOME do arquivo pedido; QUALQUER outra URL cai no fetch anterior
  // (bloqueado pelo permissionGuard → throw). Sem vetor de rede/exfil: lê dado que
  // a página já tem e não envia nada. Instalado DEPOIS do permissionGuard (ordem
  // do bootstrap), então envolve o fetch já bloqueado. Só entra quando há 3D.
  const assetFetchBlock =
    Object.keys(safe3D).length > 0
      ? `
  (function () {
    var stripExt = function (n) { return n.replace(/\\.[^.]+$/, ''); };
    var lookup = function (u) {
      var s = typeof u === 'string' ? u : (u && u.url) || '';
      if (!s) return null;
      var name;
      try { name = decodeURIComponent(s.split('?')[0].split('#')[0].split('/').pop() || ''); }
      catch (e) { name = ''; }
      if (!name) return null;
      var m3d = window.__SZGAME_ASSETS_3D || {};
      var bare = stripExt(name);
      for (var k in m3d) {
        if (!Object.prototype.hasOwnProperty.call(m3d, k)) continue;
        var e3 = m3d[k];
        if (e3 && e3.dataUrl && (k === name || k === bare || e3.fileName === name)) return e3.dataUrl;
      }
      var imgs = window.__SZGAME_ASSETS || {};
      if (typeof imgs[name] === 'string') return imgs[name];
      if (typeof imgs[bare] === 'string') return imgs[bare];
      return null;
    };
    var toResponse = function (dataUrl) {
      var comma = dataUrl.indexOf(',');
      var meta = comma >= 0 ? dataUrl.slice(5, comma) : '';
      var mime = meta.split(';')[0] || 'application/octet-stream';
      var payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
      var body;
      if (/;base64/i.test(meta)) {
        var bin = atob(payload);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        body = arr;
      } else {
        try { body = decodeURIComponent(payload); } catch (e) { body = payload; }
      }
      return new Response(body, { status: 200, headers: { 'Content-Type': mime } });
    };
    var prevFetch = window.fetch;
    try {
      window.fetch = function (input) {
        var dataUrl = lookup(input);
        if (dataUrl) return Promise.resolve(toResponse(dataUrl));
        if (prevFetch) return prevFetch.apply(this, arguments);
        return Promise.reject(new Error('Acesso à rede bloqueado neste preview (fetch).'));
      };
    } catch (e) {}
  })();`
      : ''
  return `(function () {
  var ASSETS;
  try { ASSETS = JSON.parse(${seedLiteral}); } catch (e) { ASSETS = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_ASSETS', { value: ASSETS, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_ASSETS = ASSETS; } catch (e2) {}
  }${metaBlock}${soundsBlock}${models3dBlock}${assetFetchBlock}
})();`
}

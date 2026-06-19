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

const ASSET_DATA_URL_PREFIX = 'data:image/'

/**
 * Constrói o `<script>` (string) que define `window.__SZGAME_ASSETS`. Filtra para
 * só aceitar valores `data:image/...` — defesa em profundidade caso um chamador
 * passe um manifesto não saneado.
 */
export function buildAssetsRuntime(assets: Record<string, string> = {}): string {
  const safe: Record<string, string> = {}
  for (const [name, url] of Object.entries(assets)) {
    if (
      typeof name === 'string' &&
      typeof url === 'string' &&
      url.startsWith(ASSET_DATA_URL_PREFIX)
    ) {
      safe[name] = url
    }
  }
  // Doubly-encoded: o seed entra como STRING JSON + JSON.parse em runtime (não como
  // objeto literal), criando chaves PRÓPRIAS mesmo para um nome literal `__proto__`
  // (que num literal redefiniria o protótipo). Idêntico ao storageBridge.
  const seedLiteral = JSON.stringify(JSON.stringify(safe))
  return `(function () {
  var ASSETS;
  try { ASSETS = JSON.parse(${seedLiteral}); } catch (e) { ASSETS = {}; }
  try {
    Object.defineProperty(window, '__SZGAME_ASSETS', { value: ASSETS, writable: false, configurable: true });
  } catch (e) {
    try { window.__SZGAME_ASSETS = ASSETS; } catch (e2) {}
  }
})();`
}

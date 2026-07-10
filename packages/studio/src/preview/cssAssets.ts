/**
 * Resolve `url(<nome-de-asset>)` no CSS do PREVIEW para o data:URL do asset
 * embutido. O CSS PERSISTIDO continua com o nome lógico (`background:
 * url('background.png')`) — a troca acontece só na montagem do documento do
 * iframe (buildPreviewDoc), o mesmo ponto onde o JS ganha `__SZGAME_ASSETS`.
 * Sem isto, o manifest de assets só alimentava os blocos de imagem do JS e um
 * fundo por CSS ficava quebrado no sandbox (sem rede/arquivos relativos).
 */

// url( <aspas opcionais> conteúdo <aspas> ) — captura o miolo sem parênteses.
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

/** Esquemas/formas que NUNCA são nome de asset do projeto. */
function isExternalUrl(value: string): boolean {
  return (
    value.startsWith('data:') ||
    value.startsWith('http:') ||
    value.startsWith('https:') ||
    value.startsWith('blob:') ||
    value.startsWith('#') ||
    value.startsWith('//')
  )
}

/**
 * Reescreve cada `url(...)` cujo miolo casa EXATAMENTE o nome de um asset do
 * manifest (`nome → data:URL`). Qualquer outra coisa fica byte a byte como
 * estava. Aceita o nome percent-encoded (`meu%20fundo.png`) — o serializador de
 * CSS pode escapar espaços.
 */
export function rewriteCssAssetUrls(css: string, assets: Record<string, string>): string {
  if (!css || Object.keys(assets).length === 0) return css
  return css.replace(CSS_URL_RE, (match, _quote: string, rawName: string) => {
    const name = rawName.trim()
    if (!name || isExternalUrl(name)) return match
    let dataUrl = assets[name]
    if (!dataUrl) {
      try {
        dataUrl = assets[decodeURIComponent(name)]
      } catch {
        // Percent-encoding inválido: não é um nome nosso.
      }
    }
    if (!dataUrl?.startsWith('data:')) return match
    return `url("${dataUrl}")`
  })
}

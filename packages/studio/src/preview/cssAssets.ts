import { normalizeAssetName } from '#core'

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
 * Acha a CHAVE do manifest que o miolo da url() referencia: match exato, depois
 * percent-decoded, depois pelo nome NORMALIZADO — `normalizeAssetName` remove
 * pontos ('background.png' vira o asset 'backgroundpng'), então o CSS colado de
 * um tutorial referencia um nome que o painel de Imagens nunca produz; o
 * fallback normalizado faz o `url('background.png')` achar o asset mesmo assim.
 */
function resolveAssetKey(rawName: string, assets: Record<string, string>): string | null {
  const name = rawName.trim()
  if (!name || isExternalUrl(name)) return null
  if (name in assets) return name
  try {
    const decoded = decodeURIComponent(name)
    if (decoded in assets) return decoded
  } catch {
    // Percent-encoding inválido: segue para o fallback normalizado.
  }
  const normalized = normalizeAssetName(name)
  if (normalized && normalized in assets) return normalized
  return null
}

/**
 * Reescreve cada `url(...)` que referencia um asset do manifest (`nome →
 * data:URL`) para o data:URL embutido. Qualquer outra coisa fica byte a byte.
 */
export function rewriteCssAssetUrls(css: string, assets: Record<string, string>): string {
  if (!css || Object.keys(assets).length === 0) return css
  return css.replace(CSS_URL_RE, (match, _quote: string, rawName: string) => {
    const key = resolveAssetKey(rawName, assets)
    const dataUrl = key ? assets[key] : undefined
    if (!dataUrl?.startsWith('data:')) return match
    return `url("${dataUrl}")`
  })
}

/**
 * Reescreve cada `url(...)` que referencia um asset para o NOME REAL (chave do
 * manifest). Usado pelo EXPORT: o binário vai para `public/<chave>`, então o
 * CSS do ZIP precisa apontar a chave — `url('background.png')` com asset
 * normalizado `backgroundpng` viraria 404 no site publicado.
 */
export function rewriteCssAssetUrlsToAssetNames(
  css: string,
  assets: Record<string, string>,
): string {
  if (!css || Object.keys(assets).length === 0) return css
  return css.replace(CSS_URL_RE, (match, _quote: string, rawName: string) => {
    const key = resolveAssetKey(rawName, assets)
    if (!key || key === rawName.trim()) return match
    return `url("${key}")`
  })
}

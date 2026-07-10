import { describe, expect, it } from 'bun:test'
import { rewriteCssAssetUrls, rewriteCssAssetUrlsToAssetNames } from '../cssAssets'

const PNG = 'data:image/png;base64,AAAA'
const assets = { 'background.png': PNG, 'meu fundo.png': PNG }

describe('rewriteCssAssetUrls', () => {
  it('resolve url() com e sem aspas para o data:URL do asset', () => {
    expect(rewriteCssAssetUrls("#c { background: url('background.png'); }", assets)).toBe(
      `#c { background: url("${PNG}"); }`,
    )
    expect(rewriteCssAssetUrls('#c { background: url("background.png"); }', assets)).toBe(
      `#c { background: url("${PNG}"); }`,
    )
    expect(rewriteCssAssetUrls('#c { background: url(background.png); }', assets)).toBe(
      `#c { background: url("${PNG}"); }`,
    )
  })

  it('nome desconhecido, esquemas externos e âncoras ficam byte a byte', () => {
    const css = [
      "a { background: url('nao-existe.png'); }",
      "b { background: url('https://x.exemplo/y.png'); }",
      "c { background: url('data:image/gif;base64,BB'); }",
      "d { clip-path: url('#recorte'); }",
      "e { background: url('//cdn.exemplo/z.png'); }",
    ].join('\n')
    expect(rewriteCssAssetUrls(css, assets)).toBe(css)
  })

  it('aceita nome percent-encoded (espaço escapado pelo serializador)', () => {
    expect(rewriteCssAssetUrls("#c { background: url('meu%20fundo.png'); }", assets)).toBe(
      `#c { background: url("${PNG}"); }`,
    )
  })

  it('sem assets (ou css vazio) devolve a entrada intocada', () => {
    const css = "#c { background: url('background.png'); }"
    expect(rewriteCssAssetUrls(css, {})).toBe(css)
    expect(rewriteCssAssetUrls('', assets)).toBe('')
  })

  it('fallback pelo nome NORMALIZADO: url(fundo.png) acha o asset "fundopng"', () => {
    // normalizeAssetName remove pontos — o painel de Imagens nunca produz um
    // nome com ".png", mas o CSS colado de tutorial referencia assim.
    const normalized = { backgroundpng: PNG }
    expect(rewriteCssAssetUrls("#c { background: url('background.png'); }", normalized)).toBe(
      `#c { background: url("${PNG}"); }`,
    )
  })
})

describe('rewriteCssAssetUrlsToAssetNames (export)', () => {
  it('aponta o NOME REAL do arquivo exportado quando o miolo não é a chave', () => {
    const normalized = { backgroundpng: PNG }
    expect(
      rewriteCssAssetUrlsToAssetNames("#c { background: url('background.png'); }", normalized),
    ).toBe('#c { background: url("backgroundpng"); }')
    // Já é a chave → byte a byte.
    const exact = "#c { background: url('backgroundpng'); }"
    expect(rewriteCssAssetUrlsToAssetNames(exact, normalized)).toBe(exact)
    // Externo/desconhecido → intocado.
    const ext = "#c { background: url('https://x/y.png'); }"
    expect(rewriteCssAssetUrlsToAssetNames(ext, normalized)).toBe(ext)
  })
})

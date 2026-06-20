import { describe, expect, it } from 'bun:test'
import { buildProductionIndexHtml } from '../productionHtml'

const BASE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>App</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<h1>oi</h1>
<script src="script.js"></script>
</body>
</html>
`

describe('buildProductionIndexHtml', () => {
  it('sem extensoes nem extras devolve o HTML praticamente intacto (so injeta o meta de endurecimento)', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    // Unica diferenca: o meta minimo de endurecimento perto do topo do <head>.
    const expected = BASE_HTML.replace(
      '<head>\n',
      `<head>\n<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'">\n`,
    )
    expect(out).toBe(expected)
  })

  it('injeta o meta minimo de endurecimento perto do topo do <head>', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toContain(
      `<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'">`,
    )
    // Logo apos a abertura <head> (perto do topo, antes do charset/title).
    expect(out).toMatch(/<head>\s*<meta http-equiv="Content-Security-Policy"/i)
  })

  it('injeta importmap, script de extensao (module) e adia o script classico', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: ['cores.css'],
      extraHtmlFragments: ['<div id="extra"></div>'],
    })
    expect(out).toContain('<script type="importmap">')
    expect(out).toContain('https://esm.sh/three@0.180.0')
    expect(out).toContain('<script type="module" src="sz-ext/game-3d.js"></script>')
    expect(out).toContain('<link rel="stylesheet" href="cores.css" />')
    expect(out).toContain('<div id="extra"></div>')
    // script classico do aluno deve receber defer (roda apos o module da extensao)
    expect(out).toMatch(/<script[^>]*\bsrc=["']script\.js["'][^>]*\bdefer/i)
  })

  it('quando o JS do aluno e module, vira type=module em vez de defer', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: true,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toMatch(/<script[^>]*\bsrc=["']script\.js["'][^>]*\btype="module"/i)
    expect(out).not.toMatch(/<script[^>]*\bsrc=["']script\.js["'][^>]*\bdefer/i)
  })

  it('neutraliza </script no JSON do importmap', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: false,
      jsIsModule: false,
      importmap: { evil: 'a</script>b' },
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toContain('<\\/script')
    expect(out).not.toContain('a</script>b')
  })

  it('injeta SO o CSP minimo de endurecimento, nenhum instrumental de dev', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    // O endurecimento minimo (object-src/base-uri) ESTA presente...
    expect(out).toContain(
      `<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'">`,
    )
    // ...mas o unico CSP e esse (nada da CSP restritiva de dev vaza para o export).
    expect((out.match(/Content-Security-Policy/g) ?? []).length).toBe(1)
    expect(out).not.toContain('worker-src')
    expect(out).not.toContain("connect-src 'none'")
    expect(out).not.toContain('script-src')
    expect(out).not.toContain('sandbox')
    // Nenhum instrumental de dev (interceptor de sandbox, loopGuard, storage, data: URLs).
    expect(out).not.toContain('__szLoopTick')
    expect(out).not.toContain('__szInterceptor')
    expect(out).not.toContain('data:text/javascript;base64')
    expect(out).not.toContain('StorageBridge')
  })

  it('A1: reinjeta o link de style.css quando o html nao referencia (mas o arquivo existe)', () => {
    const out = buildProductionIndexHtml({
      html: '<!doctype html><html><head><title>x</title></head><body></body></html>',
      hasExternalCss: true,
      hasExternalJs: false,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toContain('<link rel="stylesheet" href="style.css" />')
  })

  it('A1: NAO duplica o link de style.css quando o html ja referencia', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out.match(/href="style\.css"/g)?.length).toBe(1)
  })

  it('A1: reinjeta o script de script.js quando o html nao referencia', () => {
    const out = buildProductionIndexHtml({
      html: '<!doctype html><html><head></head><body><h1>oi</h1></body></html>',
      hasExternalCss: false,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: [],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toMatch(/<script[^>]*src="script\.js"[^>]*><\/script>/)
  })

  it('A1: o script reinjetado vira module quando o JS do aluno e module', () => {
    const out = buildProductionIndexHtml({
      html: '<!doctype html><html><head></head><body></body></html>',
      hasExternalCss: false,
      hasExternalJs: true,
      jsIsModule: true,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toMatch(/<script type="module" src="script\.js"><\/script>/)
  })

  it('M2: data-src nao e confundido com o loader real do script.js', () => {
    const html =
      '<!doctype html><html><head></head><body><script data-src="script.js"></script><script src="script.js"></script></body></html>'
    const out = buildProductionIndexHtml({
      html,
      hasExternalCss: false,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    // O data-src permanece intocado; so o loader real recebe defer.
    expect(out).toContain('<script data-src="script.js"></script>')
    expect(out).toMatch(
      /<script[^>]*\bdefer[^>]*\bsrc="script\.js"|<script[^>]* src="script\.js"[^>]*\bdefer/,
    )
  })

  it('M2: ajusta TODOS os loaders reais de script.js (replace global)', () => {
    const html =
      '<!doctype html><html><head></head><body><script src="script.js"></script><div>x</div><script src="script.js"></script></body></html>'
    const out = buildProductionIndexHtml({
      html,
      hasExternalCss: false,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    // Os dois loaders recebem defer (decisao deterministica: ajusta todos).
    expect((out.match(/\bdefer\b/g) ?? []).length).toBe(2)
  })

  it('M2: atributo com > no valor antes/depois nao impede o ajuste do src real', () => {
    const html =
      '<!doctype html><html><head></head><body><script data-tpl="a>b" src="script.js"></script></body></html>'
    const out = buildProductionIndexHtml({
      html,
      hasExternalCss: false,
      hasExternalJs: true,
      jsIsModule: true,
      importmap: { three: 'https://esm.sh/three@0.180.0' },
      extensionScriptSrcs: ['sz-ext/game-3d.js'],
      extraCssHrefs: [],
      extraHtmlFragments: [],
    })
    expect(out).toMatch(
      /<script[^>]*src="script\.js"[^>]*type="module"|<script[^>]*type="module"[^>]*src="script\.js"/,
    )
  })

  it('LOW: escapeAttr escapa < e > nos hrefs/srcs injetados (defesa em profundidade)', () => {
    const out = buildProductionIndexHtml({
      html: BASE_HTML,
      hasExternalCss: true,
      hasExternalJs: true,
      jsIsModule: false,
      importmap: {},
      extensionScriptSrcs: ['sz-ext/<x>.js'],
      extraCssHrefs: ['<y>.css'],
      extraHtmlFragments: [],
    })
    expect(out).toContain('&lt;x&gt;')
    expect(out).toContain('&lt;y&gt;')
    expect(out).not.toContain('src="sz-ext/<x>.js"')
  })
})

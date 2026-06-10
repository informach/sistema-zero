import { describe, expect, it } from 'bun:test'
import { buildPreviewDoc } from '../bootstrap'
import { PREVIEW_INTERCEPTOR_SCRIPT } from '../interceptors'

describe('buildPreviewDoc', () => {
  it('inclui o interceptor antes de scripts da extensão', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><h1>Oi</h1></body></html>',
      css: '',
      js: '',
      extensionScripts: ['window.MARK = 1;'],
    })
    const idxInt = doc.indexOf(PREVIEW_INTERCEPTOR_SCRIPT.slice(0, 40))
    const idxExt = doc.indexOf('window.MARK = 1;')
    expect(idxInt).toBeGreaterThan(-1)
    expect(idxExt).toBeGreaterThan(idxInt)
  })

  it('intercepta cliques em âncoras internas (evita recarregar srcdoc em branco)', () => {
    const doc = buildPreviewDoc({ html: '<a href="#x">ir</a>', css: '', js: '' })
    // O interceptor deve previnir o default e rolar até o alvo.
    expect(doc).toContain('a[href^="#"]')
    expect(doc).toContain('scrollIntoView')
    expect(doc).toContain('preventDefault')
  })

  it('injeta runtime de extensão apenas uma vez no preview', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><canvas id="tela"></canvas></body></html>',
      css: '',
      js: 'console.log("ok");',
      extensionScripts: ['window.SZGame2D = { ok: true };'],
    })

    expect(doc.match(/window\.SZGame2D/g)).toHaveLength(1)
  })

  it('embute CSS como <style> inline', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: 'body { color: red; }',
      js: '',
    })
    expect(doc).toContain('<style>body { color: red; }</style>')
  })

  it('mantém imports estáticos no topo do script module do usuário', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: 'import { ok } from "./utils.js";\nconsole.log(ok);',
      extraFiles: [{ name: 'utils.js', language: 'javascript', content: 'export const ok = 1;' }],
    })
    expect(doc).toContain(
      '<script type="module">import { ok } from "./utils.js";\nconsole.log(ok);</script>',
    )
    expect(doc).not.toContain('try{')
  })

  it('JS sem import vira <script> clássico (preserva globais + onclick)', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><button onclick="oi()">x</button></body></html>',
      css: '',
      js: 'function oi() { console.log("oi"); }',
    })
    expect(doc).toContain('<script>function oi()')
    expect(doc).not.toContain('<script type="module">')
  })

  it('inclui importmap quando há arquivos extras JS', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: '',
      extraFiles: [{ name: 'utils.js', language: 'javascript', content: 'export const ok = 1;' }],
    })
    expect(doc).toContain('type="importmap"')
    expect(doc).toContain('"./utils.js"')
    expect(doc).toContain('data:text/javascript;base64,')
  })

  it('inline arquivos extras CSS como <style data-file>', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: '',
      extraFiles: [{ name: 'cores.css', language: 'css', content: '.x { color: red; }' }],
    })
    expect(doc).toContain('<style data-file="cores.css">.x { color: red; }</style>')
  })

  it('escapa fechamentos de script/style embutidos', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: 'body::before { content: "</style>"; }',
      js: 'console.log("</script>");',
      extensionScripts: ['console.warn("</script>");'],
    })

    expect(doc).toContain('<\\/style>')
    expect(doc).toContain('<\\/script>')
    expect(doc).not.toContain('content: "</style>";')
    expect(doc).not.toContain('console.log("</script>");')
  })

  it('insere arquivo extra HTML como fragmento no body antes do script principal', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><main id="app"></main></body></html>',
      css: '',
      js: 'console.log("principal");',
      extraFiles: [{ name: 'card.html', language: 'html', content: '<section>Extra</section>' }],
    })

    expect(doc.indexOf('<section>Extra</section>')).toBeGreaterThan(doc.indexOf('<main id="app">'))
    expect(doc.indexOf('<section>Extra</section>')).toBeLessThan(
      doc.indexOf('console.log("principal")'),
    )
  })

  it('ignora arquivos extras com nomes inseguros ou reservados no preview', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: '',
      extraFiles: [
        { name: '../evil.js', language: 'javascript', content: 'console.log("evil");' },
        { name: 'script.js', language: 'javascript', content: 'console.log("reserved");' },
        { name: 'ok.mjs', language: 'javascript', content: 'export const ok = true;' },
      ],
    })

    expect(doc).not.toContain('../evil.js')
    expect(doc).not.toContain('evil')
    expect(doc).not.toContain('reserved')
    expect(doc).toContain('"./ok.mjs"')
  })

  it('remove <link rel=stylesheet href=style.css> do head do usuário', () => {
    const doc = buildPreviewDoc({
      html: '<html><head><link rel="stylesheet" href="style.css" /></head><body></body></html>',
      css: 'body { color: blue; }',
      js: '',
    })
    expect(doc).not.toContain('href="style.css"')
    expect(doc).toContain('body { color: blue; }')
  })

  it('remove <script src=script.js> do body do usuário', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><h1>Oi</h1><script src="script.js"></script></body></html>',
      css: '',
      js: 'console.log(1);',
    })
    // O <script src="script.js"></script> original deve sumir
    expect(doc).not.toMatch(/<script[^>]+src=["'][^"']*script\.js["']/)
    // Mas o JS inline (com console.log(1)) precisa estar
    expect(doc).toContain('console.log(1);')
  })

  it('aceita HTML solto sem <html>/<body>', () => {
    const doc = buildPreviewDoc({
      html: '<h1>Cru</h1>',
      css: '',
      js: '',
    })
    expect(doc).toContain('<h1>Cru</h1>')
  })
})

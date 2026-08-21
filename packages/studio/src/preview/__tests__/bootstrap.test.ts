import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { buildPreviewDoc, extensionImportUrls } from '../bootstrap'
import { PREVIEW_INTERCEPTOR_SCRIPT } from '../interceptors'

describe('buildPreviewDoc', () => {
  it('autoriza somente o conteúdo exato de cada script por hash/integridade', () => {
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: 'console.log("ok");',
      extensionScripts: ['window.__EXT__ = true;'],
      extensionImports: { pacote: 'https://esm.sh/pacote@1.0.0' },
    })
    const scriptPolicy = doc.match(/script-src[^;]*/)?.[0] ?? ''
    expect(scriptPolicy).not.toContain("'unsafe-inline'")
    expect(scriptPolicy).not.toContain("'nonce-")
    expect(scriptPolicy).toMatch(/\bdata:/)
    expect(scriptPolicy).not.toMatch(/\bblob:/)

    const inlineScripts = [...doc.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
      (match) => !/\bsrc=/i.test(match[1] ?? ''),
    )
    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const [, , content = ''] of inlineScripts) {
      const hash = `sha256-${createHash('sha256').update(content).digest('base64')}`
      expect(scriptPolicy, hash).toContain(`'${hash}'`)
    }

    const externalDataScripts = [
      ...doc.matchAll(
        /<script([^>]*\bsrc="data:text\/javascript;base64,([^"]+)"[^>]*)><\/script>/gi,
      ),
    ]
    expect(externalDataScripts.length).toBeGreaterThan(0)
    for (const [, attributes = '', encoded = ''] of externalDataScripts) {
      const code = Buffer.from(encoded, 'base64')
      const hash = `sha256-${createHash('sha256').update(code).digest('base64')}`
      expect(scriptPolicy, hash).toContain(`'${hash}'`)
      expect(attributes, hash).not.toContain('integrity')
    }
  })

  it('NENHUM script data: leva `integrity` (Firefox recusa SRI não-elegível)', () => {
    const doc = buildPreviewDoc({
      html: '<body><script>console.log(1)</script></body>',
      css: '',
      js: 'import { x } from "./extra.js"; console.log(x)',
      extraFiles: [{ name: 'extra.js', language: 'javascript', content: 'export const x = 1' }],
    })
    const dataScripts = [...doc.matchAll(/<script([^>]*\bsrc="data:[^"]+"[^>]*)>/gi)]
    expect(dataScripts.length).toBeGreaterThan(1)
    for (const [, attributes = ''] of dataScripts) {
      expect(attributes, attributes).not.toContain('integrity')
    }
    const importmapJson = doc.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1] ?? ''
    expect(importmapJson).not.toBe('')
    expect(Object.keys(JSON.parse(importmapJson))).toEqual(['imports'])
  })

  it('instrumenta <script> inline do HTML do aluno (loopGuard cobre o index.html) — 5º review #9', () => {
    const doc = buildPreviewDoc({
      html: '<body><h1>oi</h1><script>while(true){}</script></body>',
      css: '',
      js: '',
    })
    // O laço inline não roda mais cru: foi externalizado para uma data: URL.
    expect(doc).not.toContain('<script>while(true){}</script>')
    const match = doc.match(/<script[^>]*src="data:text\/javascript;base64,([^"]+)"/i)
    expect(match).not.toBeNull()
    const decoded = Buffer.from(match?.[1] ?? '', 'base64').toString('utf-8')
    // ...com a guarda de loop injetada no corpo do while.
    expect(decoded).toContain('__szLoopTick')
    expect(decoded).toContain('while')
  })

  it.each([
    '</script >',
    '</script\n>',
    '</script\t>',
    '</script/>',
  ])('instrumenta <script> fechado com %j (tokenizer fecha, regex antiga não casava)', (closeTag) => {
    const doc = buildPreviewDoc({
      html: `<body><script>while(true){}${closeTag}</body>`,
      css: '',
      js: '',
    })
    // Não pode sobrar o while CRU no doc (rodaria fora do loopGuard, congelando a aba).
    expect(doc).not.toContain('<script>while(true){}')
    const match = doc.match(/<script[^>]*src="data:text\/javascript;base64,([^"]+)"/i)
    expect(match).not.toBeNull()
    const decoded = Buffer.from(match?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('__szLoopTick')
  })

  it('preserva type="module" ao instrumentar um <script type=module> inline — 5º review #9', () => {
    const doc = buildPreviewDoc({
      html: '<body><script type="module">for(;;){}</script></body>',
      css: '',
      js: '',
    })
    expect(doc).toMatch(/<script[^>]*type="module"[^>]*src="data:text\/javascript;base64,/i)
  })

  it('não toca em <script type="importmap"> inline do aluno — 5º review #9', () => {
    const doc = buildPreviewDoc({
      html: '<body><script type="importmap">{"imports":{}}</script></body>',
      css: '',
      js: '',
    })
    expect(doc).toContain('<script type="importmap">{"imports":{}}</script>')
  })

  it('injeta a guarda de modais DEPOIS do loopGuard e ANTES de extensões/aluno', () => {
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: 'alert("oi");',
      extensionScripts: ['window.__EXT_MARKER__ = 1;'],
    })
    // Marca exclusiva da guarda de modais (wrap de alert/confirm/prompt).
    const idxModal = doc.indexOf("wrap('alert'")
    const idxLoop = doc.indexOf('__szLoopTick')
    const idxExt = doc.indexOf('__EXT_MARKER__')
    expect(idxModal).toBeGreaterThan(-1)
    // Depois do loopGuard...
    expect(idxModal).toBeGreaterThan(idxLoop)
    // ...e antes dos scripts de extensão (e, portanto, do código do aluno).
    expect(idxModal).toBeLessThan(idxExt)
  })

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

    // ⚠️ Conta a ATRIBUIÇÃO, e não a menção ao nome: o bridge do preview LÊ esse
    // global (é assim que ele desliga o pad que o próprio jogo desenha), então
    // contar `window.SZGame2D` sozinho passou a acusar quem está certo. O que a
    // guarda quer dizer é "o runtime da extensão entra UMA vez".
    expect(doc.match(/window\.SZGame2D\s*=/g)).toHaveLength(1)
  })

  it('injeta o bridge de armazenamento antes do código do aluno e semeia o snapshot', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: 'const fome = localStorage.getItem("fome");',
      localStorageSnapshot: { fome: '7' },
    })
    // O shim de localStorage está presente e semeado (seed embutido como string
    // JSON + JSON.parse em runtime — a chave do snapshot aparece no doc).
    expect(doc).toContain("install('localStorage'")
    expect(doc).toContain("install('sessionStorage'")
    expect(doc).toContain('JSON.parse(')
    expect(doc).toContain('fome')
    // E vem ANTES do script do aluno (que lê localStorage).
    const idxBridge = doc.indexOf("install('localStorage'")
    const idxUserScript = doc.lastIndexOf('<script src="data:text/javascript;base64,')
    expect(idxBridge).toBeGreaterThan(-1)
    expect(idxUserScript).toBeGreaterThan(idxBridge)
  })

  it('embute CSS como <style> inline', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: 'body { color: red; }',
      js: '',
    })
    expect(doc).toContain('<style>body { color: red; }</style>')
  })

  it('JS do aluno com import vira <script type="module"> EXTERNO via data: URL', () => {
    const js = 'import { ok } from "./utils.js";\nconsole.log(ok);'
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js,
      extraFiles: [{ name: 'utils.js', language: 'javascript', content: 'export const ok = 1;' }],
    })
    // O JS do aluno NÃO é inline: sai como module externo (data: URL), fora do
    // alcance de escapeScriptContent.
    expect(doc).toMatch(/<script type="module" src="data:text\/javascript;base64,/)
    expect(doc).not.toContain('<script type="module">import { ok }')
    const m = doc.match(
      /<script type="module" src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/,
    )
    expect(m).not.toBeNull()
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('import { ok } from "./utils.js";')
    expect(decoded).toContain('console.log(ok);')
  })

  it('JS sem import vira <script> clássico EXTERNO (preserva globais + onclick)', () => {
    const doc = buildPreviewDoc({
      html: '<html><body><button onclick="oi()">x</button></body></html>',
      css: '',
      js: 'function oi() { console.log("oi"); }',
    })
    // Clássico (sem type="module") e SEM defer (não há módulos de extensão) →
    // escopo global preservado + ordem do documento. Externo via data: URL.
    expect(doc).not.toContain('<script type="module"')
    expect(doc).toMatch(/<script src="data:text\/javascript;base64,[A-Za-z0-9+/=]+"><\/script>/)
    expect(doc).not.toMatch(/\bdefer\b/)
    const m = doc.match(/<script src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"><\/script>/)
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('function oi()')
  })

  it('instrumenta e autoriza somente os handlers HTML exatos sob a CSP', () => {
    const doc = buildPreviewDoc({
      html: `<button onclick="this.dataset.ok='sim'; while (true) {} return false">agir</button>`,
      css: '',
      js: '',
    })
    const attribute = doc.match(/onclick="([^"]+)"/)?.[1] ?? ''
    const decoded = attribute.replaceAll('&quot;', '"').replaceAll('&amp;', '&')
    const hash = `sha256-${createHash('sha256').update(decoded).digest('base64')}`
    const scriptPolicy = doc.match(/script-src[^;]*/)?.[0] ?? ''

    expect(decoded).toContain('while (true) {__szLoopTick();}')
    expect(decoded).toContain('return false')
    expect(scriptPolicy).toContain("'unsafe-hashes'")
    expect(scriptPolicy).toContain(`'${hash}'`)
    expect(scriptPolicy).not.toContain("'unsafe-inline'")
  })

  it('não relaxa script-src quando o HTML não possui handler inline', () => {
    const doc = buildPreviewDoc({ html: '<button>agir</button>', css: '', js: '' })
    expect(doc.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-hashes'")
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

  it('transpila extra .ts e mapeia ./nome, ./nome.js e ./nome.ts no importmap', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: '',
      extraFiles: [
        {
          name: 'soma.ts',
          language: 'typescript',
          content: 'export const soma = (a: number) => a + 1',
        },
      ],
    })
    expect(doc).toContain('type="importmap"')
    expect(doc).toContain('"./soma.ts"')
    expect(doc).toContain('"./soma.js"')
    expect(doc).toContain('"./soma"')
    // O conteúdo no data URL é JS transpilado (sem anotação de tipo).
    const base64 = doc.match(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/)?.[1] ?? ''
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    expect(decoded).not.toContain(': number')
    expect(decoded).toContain('soma')
  })

  it('injeta ESM e libera somente o entrypoint e o pacote pinado no esm.sh', () => {
    const doc = buildPreviewDoc({
      html: '<html><body></body></html>',
      css: '',
      js: 'import * as THREE from "three";',
      extensionImports: { three: 'https://esm.sh/three@0.180.0' },
    })
    expect(doc).toContain('type="importmap"')
    expect(doc).toContain('"three":"https://esm.sh/three@0.180.0"')
    const scriptSrc = doc.match(/script-src[^;]*/)?.[0] ?? ''
    const sources = scriptSrc.split(/\s+/).slice(1)
    expect(sources).toContain('https://esm.sh/three@0.180.0')
    expect(sources).toContain('https://esm.sh/three@0.180.0/')
    expect(sources).not.toContain('https://esm.sh')
    expect(scriptSrc).not.toContain(' blob:')
  })

  it('sem módulos de extensão, a CSP não libera origens externas em script-src', () => {
    const doc = buildPreviewDoc({ html: '<body></body>', css: '', js: '' })
    const scriptSrc = doc.match(/script-src[^;]*/)?.[0] ?? ''
    expect(scriptSrc).toMatch(/^script-src(?: 'sha256-[A-Za-z0-9+/=]+')+ data:$/)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain('blob:')
  })

  it('com módulos de extensão, o bootstrap da extensão é module e o aluno é deferido (ordem deferida)', () => {
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: 'SZGame3D.createScene("tela");',
      extensionScripts: ["import * as THREE from 'three'; window.SZGame3D = {};"],
      extensionImports: { three: 'https://esm.sh/three@0.180.0' },
    })
    // O bootstrap da extensão (importa three) é module.
    expect(doc).toMatch(/<script type="module">/)
    // ⚠️ #35: o JS do aluno SEM import/export NÃO vira module (decls do topo não
    // viram globais em module → onclick="..." quebraria). Sai como script
    // CLÁSSICO porém DEFERIDO via data: URL externo (escopo global + ordem após
    // o module da extensão). Inline defer seria ignorado.
    expect(doc).toMatch(/<script[^>]*\bdefer\b[^>]*src="data:text\/javascript;base64,/)
    const m = doc.match(
      /<script[^>]*\bdefer\b[^>]*src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/,
    )
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('SZGame3D.createScene')
    // O bootstrap da extensão (importa three) aparece ANTES do script do aluno.
    expect(doc.indexOf('window.SZGame3D = {}')).toBeLessThan(doc.indexOf('defer'))
    // ⚠️ REGRESSÃO: o importmap PRECISA vir antes de QUALQUER script type=module,
    // senão `import ... from 'three'` falha ("Failed to resolve module specifier").
    const importmapIdx = doc.indexOf('type="importmap"')
    const firstModuleIdx = doc.search(/<script type="module">/)
    expect(importmapIdx).toBeGreaterThanOrEqual(0)
    expect(importmapIdx).toBeLessThan(firstModuleIdx)
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

    // O script do aluno sai como tag externa (data: URL) no FIM do body.
    const userScriptIdx = doc.indexOf('<script src="data:text/javascript;base64,')
    expect(userScriptIdx).toBeGreaterThan(-1)
    expect(doc.indexOf('<section>Extra</section>')).toBeGreaterThan(doc.indexOf('<main id="app">'))
    expect(doc.indexOf('<section>Extra</section>')).toBeLessThan(userScriptIdx)
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
    // Mas o JS do aluno (console.log(1)) precisa estar — agora via data: URL externo.
    const m = doc.match(/<script src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"><\/script>/)
    expect(m).not.toBeNull()
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('console.log(1);')
  })

  it('aceita HTML solto sem <html>/<body>', () => {
    const doc = buildPreviewDoc({
      html: '<h1>Cru</h1>',
      css: '',
      js: '',
    })
    expect(doc).toContain('<h1>Cru</h1>')
  })

  it('com <html> e <head> mas SEM <body>, não despeja head/doctype no corpo (#21)', () => {
    const doc = buildPreviewDoc({
      html: '<!doctype html><html lang="pt-BR"><head><title>T</title><meta name="m" content="v"></head><h1>Conteúdo</h1>',
      css: '',
      js: '',
    })
    // O conteúdo real fica no corpo.
    expect(doc).toContain('<h1>Conteúdo</h1>')
    // O <head> do aluno é extraído (vai para o nosso <head>), mas NÃO duplicado
    // como texto dentro do <body> gerado.
    const bodyOpen = doc.indexOf('<body>')
    const bodyClose = doc.indexOf('</body>')
    const bodyRegion = doc.slice(bodyOpen, bodyClose)
    expect(bodyRegion).not.toContain('<title>T</title>')
    expect(bodyRegion).not.toContain('name="m"')
    // E nada de <html>/doctype aninhados dentro do corpo.
    expect(bodyRegion.toLowerCase()).not.toContain('<!doctype')
    expect(bodyRegion.toLowerCase()).not.toContain('<html')
  })

  it('escapa fechamento </script literal no JSON do importmap (#34)', () => {
    // Uma URL de módulo (controlada por extensão) com `</script` literal não pode
    // fechar o <script type="importmap"> cedo.
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: 'import x from "evil";',
      extensionImports: { evil: 'data:text/javascript,//</script><script>alert(1)</script>' },
    })
    // O fechamento literal foi neutralizado (`<\/script`) e a injeção não aparece.
    expect(doc).toContain('<\\/script')
    expect(doc).not.toContain('</script><script>alert(1)')
    // E o JSON do importmap continua parseável: extraímos o conteúdo do importmap
    // e fazemos JSON.parse depois de desfazer a substituição segura `\/` → `/`.
    const m = doc.match(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/)
    expect(m).not.toBeNull()
    const raw = (m?.[1] ?? '').replace(/<\\\/script/gi, '</script')
    const parsed = JSON.parse(raw) as { imports: Record<string, string> }
    expect(parsed.imports.evil).toContain('</script>')
  })

  it('com extensão module, função global do aluno é alcançável de onclick (#35)', () => {
    // game-3d (extensionImports) força module. O JS do aluno NÃO tem
    // import/export, então deve sair como script CLÁSSICO porém DEFERIDO via
    // data: URL externo — escopo clássico (global jump() funciona no onclick) +
    // ordem após o bootstrap module da extensão.
    const doc = buildPreviewDoc({
      html: '<body><button onclick="jump()">Pular</button></body>',
      css: '',
      js: 'function jump() { console.log("pulou"); }',
      extensionScripts: ["import * as THREE from 'three'; window.SZGame3D = {};"],
      extensionImports: { three: 'https://esm.sh/three@0.180.0' },
    })
    // O JS do aluno NÃO virou type=module (senão `jump` não seria global).
    expect(doc).not.toContain('<script type="module">function jump')
    // Saiu como script externo + defer (clássico): inline defer seria ignorado.
    expect(doc).toMatch(/<script[^>]*\bdefer\b[^>]*src="data:text\/javascript;base64,/)
    // O conteúdo do aluno está no data: URL (base64), não inline.
    const m = doc.match(
      /<script[^>]*\bdefer\b[^>]*src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/,
    )
    expect(m).not.toBeNull()
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('function jump()')
    // O bootstrap da extensão (module) aparece ANTES do script deferido do aluno.
    expect(doc.indexOf('window.SZGame3D = {}')).toBeLessThan(doc.indexOf('defer'))
  })

  it('com extensão module, JS do aluno COM import continua module (externo) (#35)', () => {
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: 'import x from "./u.js";\nconsole.log(x);',
      extraFiles: [{ name: 'u.js', language: 'javascript', content: 'export default 1;' }],
      extensionImports: { three: 'https://esm.sh/three@0.180.0' },
    })
    // O JS do aluno com import sai como module EXTERNO (data: URL), não inline.
    expect(doc).toMatch(/<script type="module" src="data:text\/javascript;base64,/)
    const m = doc.match(
      /<script type="module" src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/,
    )
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    expect(decoded).toContain('import x from "./u.js";')
  })

  it('JS do aluno com /<!--/u e "</script>" em string roda sem SyntaxError (data: URL, #esc)', () => {
    // escapeScriptContent corromperia esses literais inline (`/<!--/u` →
    // `/<\!--/u` = SyntaxError sob flag u; `</script>` em string mudaria de
    // significado). Como o JS do aluno sai por data: URL externo, o conteúdo é
    // preservado verbatim e o documento NÃO contém a forma escapada do código.
    const js = 'const re = /<!--/u;\nconsole.log("</script>", re.test("<!--"));'
    const doc = buildPreviewDoc({ html: '<body></body>', css: '', js })
    // Externo via data: URL (clássico, sem defer) — não passou por escape.
    const m = doc.match(/<script src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"><\/script>/)
    expect(m).not.toBeNull()
    const decoded = Buffer.from(m?.[1] ?? '', 'base64').toString('utf-8')
    // O regex e a string ficam INTACTOS (sem `\` injetado por escapeScriptContent).
    expect(decoded).toContain('/<!--/u')
    expect(decoded).not.toContain('/<\\!--/u')
    expect(decoded).toContain('"</script>"')
    // E o decodificado é JS sintaticamente válido (não lança ao construir).
    expect(() => new Function(decoded)).not.toThrow()
  })

  it('importmap pula specifier em conflito e avisa (#collision)', () => {
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    }
    try {
      const doc = buildPreviewDoc({
        html: '<body></body>',
        css: '',
        js: '',
        // `dados.ts` e `dados.js`: ambos querem mapear `./dados` e `./dados.js`.
        // O primeiro (na ordem de extraFiles) vence; o segundo é pulado + avisado.
        extraFiles: [
          { name: 'dados.ts', language: 'typescript', content: 'export const v = 1' },
          { name: 'dados.js', language: 'javascript', content: 'export const v = 2' },
        ],
      })
      const m = doc.match(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/)
      const parsed = JSON.parse((m?.[1] ?? '').replace(/<\\\/script/gi, '</script')) as {
        imports: Record<string, string>
      }
      // Todas as chaves compartilhadas (`./dados`, `./dados.js`, `dados.js`, …)
      // apontam para o data URL do PRIMEIRO arquivo (dados.ts): o segundo
      // (dados.js) tem ambas as suas chaves em conflito e NÃO sobrescreve.
      const tsUrl = parsed.imports['./dados.ts']
      expect(tsUrl).toBeDefined()
      expect(parsed.imports['./dados']).toBe(tsUrl)
      expect(parsed.imports['./dados.js']).toBe(tsUrl)
      expect(parsed.imports['dados.js']).toBe(tsUrl)
      // E houve aviso de conflito citando o arquivo perdedor.
      expect(warnings.some((w) => w.includes('conflito') && w.includes('dados.js'))).toBe(true)
    } finally {
      console.warn = orig
    }
  })

  it('extra .tsx lança erro legível em vez de módulo que falha em resolver (#jsx)', () => {
    const doc = buildPreviewDoc({
      html: '<body></body>',
      css: '',
      js: '',
      extraFiles: [
        { name: 'App.tsx', language: 'typescript', content: 'export const App = () => <div/>' },
      ],
    })
    const base64 = doc.match(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/)?.[1] ?? ''
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    expect(decoded).toContain('throw new Error(')
    expect(decoded).toContain('JSX/TSX não é suportado')
    // NÃO emite import de react/jsx-runtime (que falharia em resolver no preview).
    expect(decoded).not.toContain('react/jsx-runtime')
  })
})

describe('extensionImportUrls', () => {
  it('autoriza dependências transitivas somente dentro do pacote esm.sh pinado', () => {
    expect(
      extensionImportUrls({
        three: 'https://esm.sh/three@0.180.0',
        loader: 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js?external=three',
      }),
    ).toEqual(['https://esm.sh/three@0.180.0', 'https://esm.sh/three@0.180.0/'])
  })

  it('não amplia pacote sem versão nem outra CDN para uma origem inteira', () => {
    expect(
      extensionImportUrls({
        latest: 'https://esm.sh/pacote',
        other: 'https://cdn.example.com/pacote@1.0.0/index.js',
      }),
    ).toEqual(['https://esm.sh/pacote', 'https://cdn.example.com/pacote@1.0.0/index.js'])
  })
})

import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { parseProjectFilesWithDiagnostics } from '../project'

const SINGLE_FILE_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>App</title>
    <style>
      h1 { color: red; }
    </style>
  </head>
  <body>
    <h1>Oi</h1>
    <script>
      console.log("oi");
    </script>
  </body>
</html>
`

describe('parseProjectFilesWithDiagnostics', () => {
  it('reporta trechos avançados preservados', () => {
    const result = parseProjectFilesWithDiagnostics({
      'index.html': '<html><body><article>Avançado</article></body></html>',
      // @keyframes tem estrutura aninhada que o parser não modela → rawCSS advanced.
      'style.css': '@keyframes girar { from { opacity: 0; } to { opacity: 1; } }',
      'script.js': 'throw new Error("falha");',
    })

    expect(result.diagnostics.filter((diagnostic) => diagnostic.kind === 'advanced')).toHaveLength(
      3,
    )
    expect(result.ir.html[0]?.type).toBe('rawHTML')
    expect(result.ir.css[0]).toMatchObject({ type: 'rawCSS', advanced: true })
    expect(result.ir.js[0]).toMatchObject({ type: 'rawJS', advanced: true })
  })

  it('preserva a casca do documento (head/doctype) e não cria bloco avançado no doc padrão', () => {
    const indexHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu projeto</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Olá, mundo!</h1>
    <script src="script.js"></script>
  </body>
</html>
`
    const result = parseProjectFilesWithDiagnostics({
      'index.html': indexHtml,
      'style.css': 'body { color: red; }',
      'script.js': "console.log('oi');",
    })

    // O <script src> de wiring não vira bloco avançado: só o <h1> sobra no body.
    expect(result.ir.html).toEqual([{ type: 'element', tag: 'h1', text: 'Olá, mundo!' }])
    expect(result.diagnostics.some((d) => d.kind === 'advanced' && d.file === 'index.html')).toBe(
      false,
    )
    // A casca preserva doctype, atributos de <html> e o conteúdo do <head>.
    expect(result.ir.htmlShell?.doctype?.toLowerCase()).toBe('<!doctype html>')
    expect(result.ir.htmlShell?.htmlAttrs).toContain('lang="pt-BR"')
    expect(result.ir.htmlShell?.head).toContain('<title>Meu projeto</title>')
    expect(result.ir.htmlShell?.head).toContain('style.css')
  })

  it('reporta erro de sintaxe sem perder o código original', () => {
    const code = 'function bad( {'
    const result = parseProjectFilesWithDiagnostics({
      'index.html': '<h1>ok</h1>',
      'style.css': '',
      'script.js': code,
    })

    expect(result.diagnostics.some((diagnostic) => diagnostic.kind === 'syntaxError')).toBe(true)
    expect(result.ir.js).toEqual([{ type: 'rawJS', code, advanced: true }])
  })

  it('extrai <style>/<script> inline para blocos quando os arquivos externos estão vazios', () => {
    const result = parseProjectFilesWithDiagnostics({
      'index.html': SINGLE_FILE_HTML,
      'style.css': '',
      'script.js': '',
    })

    // CSS e JS viraram conteúdo representável (não ficaram "presos" no HTML).
    expect(result.ir.css).toEqual([{ selector: 'h1', declarations: { color: 'red' } }])
    expect(result.ir.js.length).toBeGreaterThan(0)
    // O <script> inline NÃO virou bloco avançado: só o <h1> sobra no body.
    expect(result.ir.html).toEqual([{ type: 'element', tag: 'h1', text: 'Oi' }])
    // Placement gravado na casca; o <style> foi removido do head (sem duplicar).
    expect(result.ir.htmlShell?.cssPlacement).toBe('inline-head')
    expect(result.ir.htmlShell?.jsPlacement).toBe('inline-body-end')
    expect(result.ir.htmlShell?.head).not.toContain('<style>')
  })

  it('round-trip single-file: parse → generate volta inline, sem explodir em 3 arquivos', () => {
    const ir = parseProjectFilesWithDiagnostics({
      'index.html': SINGLE_FILE_HTML,
      'style.css': '',
      'script.js': '',
    }).ir

    const files = generateProjectFiles({ ir, projectName: 'App' })
    // Arquivos externos seguem vazios; tudo voltou pra dentro do index.html.
    expect(files['style.css']).toBe('')
    expect(files['script.js']).toBe('')
    expect(files['index.html']).toContain('<style>')
    // Sem linhas em branco sobrando onde o <style> extraído estava no <head>.
    expect(files['index.html']).not.toMatch(/\n[ \t]*\n[ \t]*\n[ \t]*<style>/)
    // Script inline clássico (preserva globais + onclick); não vira module.
    expect(files['index.html']).toContain('<script>')
    expect(files['index.html']).not.toContain('<script type="module">')
    expect(files['index.html']).toContain('color: red')

    // Reparse estável: mesma IR (placement + css/js preservados).
    const ir2 = parseProjectFilesWithDiagnostics(files).ir
    expect(ir2.css).toEqual(ir.css)
    expect(ir2.js).toEqual(ir.js)
    expect(ir2.htmlShell?.cssPlacement).toBe('inline-head')
    expect(ir2.htmlShell?.jsPlacement).toBe('inline-body-end')
  })

  it('preserva <script type="module"> inline como module na geração', () => {
    const html = `<!doctype html><html><head></head><body>
<button onclick="oi()">x</button>
<script type="module">export const a = 1;</script>
</body></html>`
    const ir = parseProjectFilesWithDiagnostics({
      'index.html': html,
      'style.css': '',
      'script.js': '',
    }).ir
    expect(ir.htmlShell?.jsModule).toBe(true)
    const files = generateProjectFiles({ ir, projectName: 'App' })
    expect(files['index.html']).toContain('<script type="module">')
  })

  it('NÃO extrai inline quando style.css já tem conteúdo (mantém external, preserva avançado)', () => {
    const result = parseProjectFilesWithDiagnostics({
      'index.html': '<body><style>h1 { color: red; }</style><h1>Oi</h1></body>',
      'style.css': 'body { margin: 0; }',
      'script.js': '',
    })

    expect(result.ir.htmlShell?.cssPlacement).toBeUndefined()
    // O CSS vem do arquivo externo; o <style> inline fica preservado como avançado.
    expect(result.ir.css).toEqual([{ selector: 'body', declarations: { margin: '0' } }])
    expect(result.ir.html.some((node) => node.type === 'rawHTML')).toBe(true)
  })
})

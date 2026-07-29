import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { parseProjectFiles } from '#parsers'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** Roda o ciclo completo da Ponte: código -> IR -> blocos -> Blockly -> IR -> código. */
function bridgeCycle(files: { 'index.html': string; 'style.css': string; 'script.js': string }) {
  const ir1 = parseProjectFiles(files)
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return generateProjectFiles({ ir: { ...ir2, htmlShell: ir1.htmlShell }, projectName: 'X' })
}

describe('round-trip da Ponte com landing page real', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('mantém texto HTML escapado como texto inerte no ciclo completo', () => {
    const out = bridgeCycle({
      'index.html': '&lt;img src=x onerror="alert(1)"&gt;',
      'style.css': '',
      'script.js': '',
    })
    const doc = new DOMParser().parseFromString(out['index.html'], 'text/html')
    expect(doc.querySelector('img')).toBeNull()
    expect(out['index.html']).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('preserva código avançado (CSS com *, :hover, @media) no ciclo blocos<->código', () => {
    const css = `* { margin: 0; box-sizing: border-box; }
.nav a:hover { color: #2563eb; }
@media (max-width: 768px) {
  .nav { display: none; }
}`
    const out = bridgeCycle({ 'index.html': '<h1>oi</h1>', 'style.css': css, 'script.js': '' })
    expect(out['style.css']).toContain('box-sizing')
    expect(out['style.css']).toContain(':hover')
    expect(out['style.css']).toContain('@media')
  })

  it('preserva JS avançado multilinha (quebras de linha intactas) no round-trip', () => {
    // Código que os blocos não modelam → vira bloco "JS avançado" (rawJS).
    const js = `try {\n  console.log("tick");\n} catch (e) {\n  console.log("erro");\n}`
    const out = bridgeCycle({ 'index.html': '<h1>oi</h1>', 'style.css': '', 'script.js': js })
    expect(out['script.js']).toContain('try')
    expect(out['script.js']).toContain('console.log("tick")')
    // As quebras de linha do corpo precisam sobreviver (o campo CODE não pode
    // colar as linhas — senão o `}` e o `catch` se perderiam).
    expect(out['script.js']).toMatch(/try \{\s*\n/)
  })

  it('mapeia elementos com class para blocos (não vira tudo avançado) e preserva a class', () => {
    const html = `<header class="header"><nav class="nav" id="navMenu">
      <a href="#x" class="link">Benefícios</a>
    </nav></header>
    <section class="hero"><h2 class="title">Olá</h2><p>texto</p></section>`
    const ir1 = parseProjectFiles({ 'index.html': html, 'style.css': '', 'script.js': '' })
    // O parser deve produzir elementos (não rawHTML) para as tags suportadas.
    expect(ir1.html.every((n) => n.type !== 'rawHTML')).toBe(true)

    const out = bridgeCycle({ 'index.html': html, 'style.css': '', 'script.js': '' })
    // class preservada no round-trip completo (via data do bloco).
    expect(out['index.html']).toContain('class="header"')
    expect(out['index.html']).toContain('class="nav"')
    expect(out['index.html']).toContain('id="navMenu"')
    expect(out['index.html']).toContain('class="link"')
    expect(out['index.html']).toContain('href="#x"')
    expect(out['index.html']).toContain('Benefícios')
    expect(out['index.html']).toContain('class="title"')
    expect(out['index.html']).toContain('Olá')
  })

  it('decompõe <p> com conteúdo misto em blocos e preserva no round-trip', () => {
    const html = '<footer><p>© <span id="currentYear"></span> Sistema Zero.</p></footer>'
    const ir1 = parseProjectFiles({ 'index.html': html, 'style.css': '', 'script.js': '' })
    // Nada cai em rawHTML — o <p> misto virou elemento com filhos.
    const flat = JSON.stringify(ir1.html)
    expect(flat).not.toContain('rawHTML')

    const out = bridgeCycle({ 'index.html': html, 'style.css': '', 'script.js': '' })
    expect(out['index.html']).toContain('©')
    expect(out['index.html']).toContain('<span id="currentYear"></span>')
    expect(out['index.html']).toContain('Sistema Zero.')
  })

  it('preserva tipos de campo comuns e o conteúdo inicial da área de texto', () => {
    const html =
      '<form><input type="checkbox"><input type="date"><textarea id="bio">valor inicial</textarea></form>'
    const out = bridgeCycle({ 'index.html': html, 'style.css': '', 'script.js': '' })
    expect(out['index.html']).toContain('<input type="checkbox" />')
    expect(out['index.html']).toContain('<input type="date" />')
    expect(out['index.html']).toContain('<textarea id="bio">valor inicial</textarea>')
    expect(out['index.html']).not.toContain('placeholder=""')
  })

  it('não inventa id ao importar um botão sem id', () => {
    const out = bridgeCycle({
      'index.html': '<button>Salvar</button>',
      'style.css': '',
      'script.js': '',
    })
    expect(out['index.html']).toContain('<button>Salvar</button>')
    expect(out['index.html']).not.toContain('id="meuBotao"')
  })

  it('converte CSS com pseudo-classe e propriedade arbitrária em blocos (não avançado)', () => {
    const css = `.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.button:hover { background: #1d4ed8; }`
    const ir1 = parseProjectFiles({
      'index.html': '<h1>oi</h1>',
      'style.css': css,
      'script.js': '',
    })
    // Vira CSSRule (não rawCSS) — reconstruído como "Regra CSS" + "propriedade: valor".
    expect(ir1.css.every((e) => !('type' in e && e.type === 'rawCSS'))).toBe(true)

    const out = bridgeCycle({ 'index.html': '<h1>oi</h1>', 'style.css': css, 'script.js': '' })
    expect(out['style.css']).toContain('grid-template-columns: repeat(3, 1fr)')
    expect(out['style.css']).toContain('.button:hover')
    expect(out['style.css']).toContain('background: #1d4ed8')
  })

  it('converte o JS da landing (getElementById + addEventListener) em blocos', () => {
    const js = `const menuButton = document.getElementById("menuButton");
const navMenu = document.getElementById("navMenu");
menuButton.addEventListener("click", () => {
  navMenu.classList.toggle("active");
});`
    const out = bridgeCycle({ 'index.html': '<h1>oi</h1>', 'style.css': '', 'script.js': js })
    expect(out['script.js']).toContain('document.getElementById("menuButton")')
    expect(out['script.js']).toContain('.addEventListener("click"')
    expect(out['script.js']).toContain('.classList.toggle("active")')
    // O comportamento foi modelado em blocos, não preservado como rawJS bruto.
    expect(out['script.js']).not.toContain('// código avançado')
  })
})

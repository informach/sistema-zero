import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import 'blockly/blocks'
import { parseProjectFilesWithDiagnostics } from '../../parsers'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/**
 * 🎮 Blocos CSS de jogo (posição, display, cursor, image-rendering, overflow,
 * object-fit, opacity, z-index, background-image): as propriedades que os jogos
 * mais usam ganharam BLOCO DEDICADO. Prova que, ao abrir um CSS de jogo, a Ponte
 * devolve os blocos amigáveis — NÃO a "Regra CSS" genérica — e que tudo
 * round-trippa byte-a-byte (IR genérica reusada; o dedicado é re-derivado no
 * workspaceState).
 */

// Na ORDEM em que o cssEntryToBlocks re-deriva (position → offsets → display →
// overflow → cursor → image-rendering → object-fit → opacity → z-index → bg): CSS
// pode reordenar declarações sem mudar a renderização (lossless), então alinhamos
// a ordem para provar a ida-e-volta BYTE-A-BYTE.
const CSS = `#canvas1 {
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    overflow: hidden;
    cursor: pointer;
    image-rendering: pixelated;
    object-fit: cover;
    opacity: 0.8;
    z-index: 10;
    background-image: url('fundo.png');
}`

const FILES = {
  'index.html':
    '<!DOCTYPE html><html><head><title>x</title><link rel="stylesheet" href="style.css"></head><body><canvas id="canvas1"></canvas><script src="script.js"></script></body></html>',
  'style.css': CSS,
  'script.js': 'const x = 1;',
}

const DEDICATED = [
  'sz_css_position',
  'sz_css_offset',
  'sz_css_display',
  'sz_css_overflow',
  'sz_css_cursor',
  'sz_css_image_rendering',
  'sz_css_object_fit',
  'sz_css_opacity',
  'sz_css_z_index',
  'sz_css_background_image',
]

describe('blocos CSS de jogo — dedicados no lugar da regra genérica', () => {
  it('a Ponte devolve os blocos DEDICADOS (sem cair na Regra/propriedade genérica)', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(FILES)
    expect(diagnostics).toEqual([])
    const state = JSON.stringify(buildWorkspaceStateFromIR(ir))
    for (const t of DEDICATED) {
      expect(state).toContain(`"${t}"`)
    }
    // nenhuma das 11 declarações sobrou para a "Regra CSS" genérica
    expect(state).not.toContain('sz_css_decl')
    expect(state).not.toContain('sz_css_rule')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → CSS byte-igual', () => {
    const { ir } = parseProjectFilesWithDiagnostics(FILES)
    const css1 = generateProjectFiles({ ir, projectName: 'x' })['style.css']
    ensureBlocklyInitialized()
    registerExtensionBlocks([])
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(
        buildWorkspaceStateFromIR(ir) as unknown as Record<string, unknown>,
        ws,
      )
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir.htmlShell }
      const css2 = generateProjectFiles({ ir: irFromBlocks, projectName: 'x' })['style.css']
      expect(css2).toBe(css1)
    } finally {
      ws.dispose()
    }
  })

  it('cada propriedade fora do enum previsto cai na regra genérica (sem coagir)', () => {
    // display: flex tem bloco PRÓPRIO (não é o "display" novo); position inválida
    // ou cursor esquisito não viram bloco dedicado — preservam o código.
    const { ir } = parseProjectFilesWithDiagnostics({
      ...FILES,
      'style.css': '#x {\n    position: quinquilharia;\n    cursor: zoom-in;\n}',
    })
    const state = JSON.stringify(buildWorkspaceStateFromIR(ir))
    expect(state).not.toContain('sz_css_position')
    expect(state).not.toContain('sz_css_cursor')
    expect(state).toContain('sz_css_decl')
  })
})

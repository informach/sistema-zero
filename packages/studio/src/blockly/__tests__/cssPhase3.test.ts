import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateCSS } from '../../generators/css'
import { parseCSS } from '../../parsers/css'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'
import { irInFrame } from './frameTestUtils'

/** IR(css) → blocos → Blockly (live) → IR(css). */
function cssBlockCycle(css: unknown[]): any[] {
  const ir = { html: [], css, js: [], extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return buildIRFromWorkspace(ws).css as any[]
}

/** Constrói UM bloco CSS direto e devolve a IR de css que ele gera (blocos forward-only). */
function cssFromBlock(type: string, fields: Record<string, string | number>): any[] {
  const ws = new Blockly.Workspace()
  const b = ws.newBlock(type)
  for (const [k, v] of Object.entries(fields)) b.setFieldValue(v as never, k)
  return irInFrame(ws, 'css').css as any[]
}

describe('Fase 3 — keyframes multi-passo + atalhos CSS', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('keyframes multi-passo sobrevive ao ciclo IR->blocos->IR (sem rawCSS)', () => {
    const css = [
      {
        type: 'keyframes',
        name: 'girar',
        steps: [
          { at: '0%', declarations: { transform: 'rotate(0deg)' } },
          { at: '50%', declarations: { transform: 'rotate(180deg)' } },
          { at: '100%', declarations: { transform: 'rotate(360deg)' } },
        ],
      },
    ]
    const out = cssBlockCycle(css)
    expect(JSON.stringify(out)).not.toContain('rawCSS')
    const kf = out.find((e) => e.type === 'keyframes')
    expect(kf).toBeTruthy()
    expect(kf.steps.length).toBe(3)
    expect(kf.steps[1].at).toBe('50%')
    expect(kf.steps[1].declarations.transform).toBe('rotate(180deg)')
  })

  it('keyframes multi-passo: gerador emite os 3 passos e o parser os recupera', () => {
    const css = [
      {
        type: 'keyframes',
        name: 'pulsar',
        steps: [
          { at: '0%', declarations: { opacity: '1' } },
          { at: '50%', declarations: { opacity: '0.3' } },
          { at: '100%', declarations: { opacity: '1' } },
        ],
      },
    ]
    const code = generateCSS(css as never)
    expect(code).toContain('@keyframes pulsar')
    expect(code).toContain('50%')
    const back = parseCSS(code)
    const kf = (back as any[]).find((e) => e.type === 'keyframes')
    expect(kf.steps.length).toBe(3)
  })

  it('atalhos: var, transform, perspective, grade geram o CSS certo', () => {
    expect(
      JSON.stringify(
        cssFromBlock('sz_css_var', { VARNAME: 'cor', VALUE: '#fff', SELECTOR: ':root' }),
      ),
    ).toContain('--cor')
    expect(
      JSON.stringify(cssFromBlock('sz_css_transform', { SELECTOR: '#x', VALUE: 'rotateX(45deg)' })),
    ).toContain('rotateX(45deg)')
    expect(
      JSON.stringify(cssFromBlock('sz_css_perspective', { SELECTOR: '#x', VALUE: 600 })),
    ).toContain('600px')
    const grid = JSON.stringify(
      cssFromBlock('sz_css_grid_template', { SELECTOR: '#x', COLS: 'repeat(3, 1fr)', ROWS: '' }),
    )
    expect(grid).toContain('grid-template-columns')
    expect(grid).toContain('repeat(3, 1fr)')
  })

  it('fluxos completos: aplica fonte, hover e animação sem propriedade manual', () => {
    const font = cssFromBlock('sz_css_use_font', {
      SELECTOR: 'body',
      FONT: 'Press Start 2P',
    })
    expect(font).toEqual([
      {
        selector: 'body',
        declarations: { 'font-family': '"Press Start 2P", sans-serif' },
        __id: expect.any(String),
      },
    ])

    const animation = cssFromBlock('sz_css_apply_animation', {
      SELECTOR: '#caixa',
      NAME: 'pulsar',
      SECONDS: 1.5,
      REPEAT: 'infinite',
    })
    expect(animation[0]?.declarations.animation).toBe('pulsar 1.5s ease-in-out infinite')

    const ws = new Blockly.Workspace()
    const hover = ws.newBlock('sz_css_hover')
    hover.setFieldValue('#caixa', 'SELECTOR')
    const declaration = ws.newBlock('sz_css_decl')
    declaration.setFieldValue('background-color', 'PROP')
    declaration.setFieldValue('#7c3aed', 'VALUE')
    hover
      .getInput('CHILDREN')
      ?.connection?.connect(declaration.previousConnection as Blockly.Connection)
    const css = irInFrame(ws, 'css').css
    expect(css[0]).toMatchObject({
      selector: '#caixa:hover',
      declarations: { 'background-color': '#7c3aed' },
    })
  })
})

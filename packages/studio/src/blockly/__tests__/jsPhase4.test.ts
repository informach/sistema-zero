import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { parseJS } from '../../parsers/js'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** código → IR → código. */
const jsCycle = (js: string): string => compileStatements(parseJS(js), 0)

/** IR(js) → blocos → Blockly (live) → IR(js). */
function jsBlockCycle(jsIR: unknown[]): any[] {
  const ir = { html: [], css: [], js: jsIR, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return buildIRFromWorkspace(ws).js as any[]
}

describe('Fase 4 — throw / Object.assign / cssText / sign / map / switch', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('throw / Object.assign / sign / map: parser↔gerador (sem rawJS)', () => {
    expect(jsCycle('throw new Error("acabou");')).toContain('throw new Error("acabou")')
    expect(jsCycle('Object.assign(bola, novo);')).toContain('Object.assign(bola, novo)')
    expect(jsCycle('const s = Math.sign(v);')).toContain('Math.sign(v)')
    expect(jsCycle('const d = nums.map((n) => n * 2);')).toContain('.map((n) => n * 2)')
    for (const js of [
      'throw new Error("x");',
      'Object.assign(a, b);',
      'const s = Math.sign(v);',
      'const d = nums.map((n) => n * 2);',
    ]) {
      expect(JSON.stringify(parseJS(js))).not.toContain('rawJS')
    }
  })

  it('cssText: gerador emite el.style.cssText = …', () => {
    const code = compileStatements(
      [
        {
          type: 'setStyle',
          targetId: 'c',
          targetKind: 'id',
          property: 'cssText',
          value: { type: 'str', value: 'left: 1px; top: 2px;' },
        },
      ],
      0,
    )
    expect(code).toContain('.style.cssText =')
  })

  it('switch: código→IR→código preserva casos e padrão (sem rawJS)', () => {
    const js = [
      'switch (dir) {',
      '  case "cima": {',
      '    y = y - 1;',
      '    break;',
      '  }',
      '  case "baixo": {',
      '    y = y + 1;',
      '    break;',
      '  }',
      '  default: {',
      '    parar();',
      '  }',
      '}',
    ].join('\n')
    const out = jsCycle(js)
    expect(out).toContain('switch (dir)')
    expect(out).toContain('case "cima"')
    expect(out).toContain('case "baixo"')
    expect(out).toContain('default:')
    expect(out).not.toContain('rawJS')
  })

  it('switch sobrevive ao ciclo IR->blocos->IR', () => {
    const jsIR = [
      {
        type: 'switch',
        subject: { type: 'var', name: 'dir' },
        cases: [
          {
            match: { type: 'str', value: 'cima' },
            body: [
              {
                type: 'assign',
                name: 'y',
                value: {
                  type: 'binop',
                  op: '-',
                  left: { type: 'var', name: 'y' },
                  right: { type: 'num', value: 1 },
                },
              },
            ],
          },
        ],
        default: [{ type: 'consoleLog', value: { type: 'str', value: 'fim' } }],
      },
    ]
    const out = jsBlockCycle(jsIR)
    expect(JSON.stringify(out)).not.toContain('rawJS')
    const sw = out.find((e) => e.type === 'switch')
    expect(sw).toBeTruthy()
    expect(sw.cases.length).toBe(1)
    expect(sw.cases[0].match.value).toBe('cima')
    expect(sw.default.length).toBe(1)
  })
})

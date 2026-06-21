import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import type { HTMLNode } from '#ir'
import { parseHTML } from '../../parsers/html'
import { parseJS } from '../../parsers/js'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/**
 * Formas SVG novas (text/ellipse/polyline/polygon) + o valor de data por partes
 * (sz_val_date_part → new Date().getHours()…). Ciclo IR → blocos → Blockly (live)
 * → IR, e o parse código → IR. Os 7 blocos SVG originais já têm cobertura em
 * `parsers/__tests__/html.test.ts`.
 */
function htmlBlockCycle(html: HTMLNode[]): HTMLNode[] {
  const ir = { html, css: [], js: [], extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return buildIRFromWorkspace(ws).html
}

describe('SVG — formas novas + data por partes', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('parseHTML reconhece ellipse/polyline/polygon/text (sem rawHTML)', () => {
    const ir = parseHTML(
      '<svg><ellipse cx="0" cy="0" rx="20" ry="10"></ellipse><polyline points="0,0 10,20"></polyline><polygon points="0,0 20,0 10,20"></polygon><text x="5" y="5">oi</text></svg>',
    )
    const json = JSON.stringify(ir)
    expect(json).not.toContain('rawHTML')
    for (const tag of ['ellipse', 'polyline', 'polygon', 'text']) {
      expect(json).toContain(`"tag":"${tag}"`)
    }
  })

  it('formas SVG novas sobrevivem ao ciclo IR->blocos->IR (sem rawHTML)', () => {
    const html: HTMLNode[] = [
      {
        type: 'element',
        tag: 'svg',
        attrs: { viewBox: '0 0 100 100' },
        children: [
          {
            type: 'element',
            tag: 'ellipse',
            attrs: { cx: '10', cy: '10', rx: '20', ry: '5', fill: 'red' },
          },
          {
            type: 'element',
            tag: 'polyline',
            attrs: { points: '0,0 10,20', fill: 'none', stroke: 'black' },
          },
          { type: 'element', tag: 'polygon', attrs: { points: '0,0 20,0 10,20' } },
          {
            type: 'element',
            tag: 'text',
            id: 'rotulo',
            text: 'oi',
            attrs: { x: '5', y: '5', fill: '#fff' },
          },
        ],
      },
    ]
    const json = JSON.stringify(htmlBlockCycle(html))
    expect(json).not.toContain('rawHTML')
    for (const tag of ['ellipse', 'polyline', 'polygon', 'text']) {
      expect(json).toContain(`"tag":"${tag}"`)
    }
    // Atributos e conteúdo preservados
    expect(json).toContain('"rx":"20"')
    expect(json).toContain('"points":"0,0 10,20"')
    expect(json).toContain('"id":"rotulo"')
    expect(json).toContain('"text":"oi"')
  })

  it('dateGet: gerador emite new Date().getHours() e o parser reconhece', () => {
    const code = compileStatements(
      [{ type: 'var', name: 'h', kind: 'const', value: { type: 'dateGet', part: 'hours' } }],
      0,
    )
    expect(code).toContain('new Date().getHours()')
    expect(JSON.stringify(parseJS('const h = new Date().getHours();'))).toContain('"dateGet"')
    expect(JSON.stringify(parseJS('const m = new Date().getMinutes();'))).toContain('"minutes"')
    // getFullYear NÃO é reivindicado pelo dateGet (segue tratado como `now`) — sem regressão.
    expect(JSON.stringify(parseJS('const a = new Date().getFullYear();'))).not.toContain('dateGet')
  })

  it('dateGet usado num setAttribute("transform", ...) — o padrão de animação do relógio', () => {
    // Como a criança monta: setAttribute("transform", juntar("rotate(", segundos, ")")).
    const out = compileStatements(
      [
        {
          type: 'setAttribute',
          targetId: 'ponteiro',
          targetKind: 'id',
          name: 'transform',
          value: {
            type: 'concat',
            parts: [
              { type: 'str', value: 'rotate(' },
              { type: 'dateGet', part: 'seconds' },
              { type: 'str', value: ')' },
            ],
          },
        },
      ],
      0,
    )
    expect(out).toContain('new Date().getSeconds()')
    expect(out).toContain('setAttribute("transform"')
    expect(out).not.toContain('rawJS')
  })
})

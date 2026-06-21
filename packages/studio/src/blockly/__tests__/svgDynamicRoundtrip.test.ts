import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../../parsers/js'

/**
 * Fase 2 — SVG dinâmico: criar formas SVG por código (createElementNS), ler
 * atributos (getAttribute) e o ciclo código↔IR↔código sem cair em rawJS.
 */
const NS = 'document.createElementNS("http://www.w3.org/2000/svg", "circle")'

describe('SVG dinâmico (createElementNS + getAttribute)', () => {
  it('gerador: createElementNS e getAttribute', () => {
    expect(
      compileStatements([{ type: 'createElementNS', tag: 'circle', varName: 'forma' }], 0),
    ).toContain(NS)
    expect(
      compileStatements(
        [
          {
            type: 'getAttribute',
            targetId: 'forma',
            targetKind: 'var',
            name: 'cx',
            varName: 'valor',
          },
        ],
        0,
      ),
    ).toContain('.getAttribute("cx")')
  })

  it('parser: reconhece createElementNS e getAttribute', () => {
    expect(JSON.stringify(parseJS(`const forma = ${NS};`))).toContain('"createElementNS"')
    expect(
      JSON.stringify(
        parseJS('const c = document.getElementById("p");\nconst v = c.getAttribute("cx");'),
      ),
    ).toContain('"getAttribute"')
  })

  it('cria forma SVG, configura e anexa — sobrevive ao ciclo (sem rawJS)', () => {
    const js = [
      'const board = document.getElementById("board");',
      `const forma = ${NS};`,
      'forma.setAttribute("cx", "50");',
      'forma.setAttribute("r", "20");',
      'board.appendChild(forma);',
      'const raio = forma.getAttribute("r");',
    ].join('\n')
    const out = compileStatements(parseJS(js), 0)
    expect(out).toContain(NS)
    expect(out).toContain('.setAttribute("cx"')
    expect(out).toContain('.appendChild(')
    expect(out).toContain('.getAttribute("r")')
    expect(out).not.toContain('rawJS')
  })
})

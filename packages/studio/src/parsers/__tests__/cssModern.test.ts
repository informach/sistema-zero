import { describe, expect, it } from 'bun:test'
import { generateCSS } from '#generators'
import type { CSSEntry } from '#ir'
import { parseCSS } from '../css'

function roundtrip(ir: CSSEntry[]): CSSEntry[] {
  return parseCSS(generateCSS(ir))
}

/** Discriminante seguro: `CSSRule` (regra comum) não tem `type` na união. */
function entryType(entry: CSSEntry | undefined): string {
  return entry && 'type' in entry ? entry.type : 'rule'
}

describe('CSS moderno — @keyframes', () => {
  it('parseia @keyframes from/to estruturado', () => {
    const ir = parseCSS('@keyframes aparecer {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}')
    expect(ir[0]).toEqual({
      type: 'keyframes',
      name: 'aparecer',
      steps: [
        { at: 'from', declarations: { opacity: '0' } },
        { at: 'to', declarations: { opacity: '1' } },
      ],
    })
  })

  it('parseia @keyframes multi-passo (0%/50%/100%)', () => {
    const ir = parseCSS(
      '@keyframes pulsar { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }',
    )
    expect(entryType(ir[0])).toBe('keyframes')
    expect((ir[0] as Extract<CSSEntry, { type: 'keyframes' }>).steps).toHaveLength(3)
  })

  it('gera @keyframes legível', () => {
    const code = generateCSS([
      {
        type: 'keyframes',
        name: 'girar',
        steps: [
          { at: 'from', declarations: { transform: 'rotate(0deg)' } },
          { at: 'to', declarations: { transform: 'rotate(360deg)' } },
        ],
      },
    ])
    expect(code).toContain('@keyframes girar {')
    expect(code).toContain('from {')
    expect(code).toContain('transform: rotate(360deg);')
  })

  it('roundtrip estável de @keyframes', () => {
    const ir = parseCSS('@keyframes deslizar {\n  from { left: 0px; }\n  to { left: 100px; }\n}')
    expect(roundtrip(ir)).toEqual(ir)
  })

  it('@-rule não reconhecida continua rawCSS', () => {
    const ir = parseCSS('@font-face { font-family: "X"; src: url(x.woff2); }')
    expect(entryType(ir[0])).toBe('rawCSS')
  })

  it('media query continua estruturada (não confunde com keyframes)', () => {
    const ir = parseCSS('@media (max-width: 600px) { body { color: red; } }')
    expect(entryType(ir[0])).toBe('mediaQuery')
  })
})

describe('CSS moderno — propriedades genéricas já roundtripam', () => {
  it('transform/transition/grid/variável como regra genérica', () => {
    const css =
      '.x {\n  transform: rotate(10deg);\n  transition: all 0.3s ease;\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  --cor: #fff;\n  color: var(--cor);\n}'
    const ir = parseCSS(css)
    expect(ir).toHaveLength(1)
    expect(roundtrip(ir)).toEqual(ir)
  })
})

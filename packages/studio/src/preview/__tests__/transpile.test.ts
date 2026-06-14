import { describe, expect, it } from 'bun:test'
import { transpileExtra } from '../transpile'

describe('transpileExtra', () => {
  it('remove anotações de tipo de um .ts', () => {
    const out = transpileExtra(
      'tipos.ts',
      'export const soma = (a: number, b: number): number => a + b',
    )
    expect(out).not.toContain(': number')
    expect(out).toContain('soma')
  })

  it('rejeita .tsx com throw legível (sem React no preview)', () => {
    const out = transpileExtra('App.tsx', 'export const App = () => <div className="x">oi</div>')
    expect(out).toContain('throw new Error(')
    expect(out).toContain('JSX/TSX não é suportado')
    expect(out).toContain('App.tsx')
    // NÃO emite import de react/jsx-runtime (que falharia em resolver no preview).
    expect(out).not.toContain('react/jsx-runtime')
    expect(out).not.toContain('<div')
  })

  it('rejeita .jsx com throw legível (sem React no preview)', () => {
    const out = transpileExtra('comp.jsx', 'export const C = () => <span>oi</span>')
    expect(out).toContain('throw new Error(')
    expect(out).toContain('JSX/TSX não é suportado')
    expect(out).toContain('comp.jsx')
    expect(out).not.toContain('react/jsx-runtime')
    expect(out).not.toContain('<span>')
  })

  it('passa .js/.mjs direto (sem transpile)', () => {
    const code = 'export const x = 1'
    expect(transpileExtra('a.js', code)).toBe(code)
    expect(transpileExtra('a.mjs', code)).toBe(code)
  })

  it('erro de sintaxe vira throw legível (não quebra o preview)', () => {
    const out = transpileExtra('ruim.ts', 'const a: = ')
    expect(out).toContain('throw new Error(')
    expect(out).toContain('ruim.ts')
  })
})

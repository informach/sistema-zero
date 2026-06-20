import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../js'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('DOM "na mão" — estilo por código, atributo, densidade, modo escuro', () => {
  it('setStyle: el.style.left = … (por id) e por variável, prop hifenizada', () => {
    expect(parseJS('document.getElementById("caixa").style.left = "10px";')).toEqual([
      {
        type: 'setStyle',
        targetId: 'caixa',
        property: 'left',
        value: { type: 'str', value: '10px' },
      },
    ])
    expect(parseJS('moinho.style["z-index"] = "2";')).toEqual([
      {
        type: 'setStyle',
        targetId: 'moinho',
        targetKind: 'var',
        property: 'z-index',
        value: { type: 'str', value: '2' },
      },
    ])
  })

  it('setAttribute: el.setAttribute("stroke", …)', () => {
    expect(parseJS('forma.setAttribute("stroke", "white");')).toEqual([
      {
        type: 'setAttribute',
        targetId: 'forma',
        targetKind: 'var',
        name: 'stroke',
        value: { type: 'str', value: 'white' },
      },
    ])
  })

  it('devicePixelRatio e systemDark como valores num "se"', () => {
    const ir: JSStatement[] = [
      {
        type: 'var',
        kind: 'const',
        name: 'dpr',
        value: { type: 'global', kind: 'devicePixelRatio' },
      },
      {
        type: 'if',
        cond: { type: 'systemDark' },
        then: [],
      },
    ]
    const code = compileStatements(ir, 0)
    expect(code).toContain('window.devicePixelRatio')
    expect(code).toContain("window.matchMedia('(prefers-color-scheme: dark)').matches")
    const types = collectTypes(parseJS(code))
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('systemDark')).toBe(true)
    expect(types.has('global')).toBe(true)
  })

  it('round-trip: gera → parseia sem virar rawJS', () => {
    const ir: JSStatement[] = [
      {
        type: 'setStyle',
        targetId: 'painel',
        targetKind: 'var',
        property: 'opacity',
        value: { type: 'num', value: 1 },
      },
      {
        type: 'setAttribute',
        targetId: 'cata',
        targetKind: 'var',
        name: 'transform',
        value: { type: 'str', value: 'rotate(45)' },
      },
    ]
    const code = compileStatements(ir, 0)
    expect(collectTypes(parseJS(code)).has('rawJS')).toBe(false)
  })
})

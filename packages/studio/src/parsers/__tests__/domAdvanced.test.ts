import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../js'

function roundtrip(ir: JSStatement[]): JSStatement[] {
  return parseJS(compileStatements(ir, 0))
}

describe('DOM avançado — querySelectorAll', () => {
  it('parseia querySelectorAll', () => {
    const ir = parseJS('const itens = document.querySelectorAll(".item");')
    expect(ir[0]).toEqual({ type: 'querySelectorAll', selector: '.item', varName: 'itens' })
  })

  it('querySelector simples continua querySelector', () => {
    const ir = parseJS('const caixa = document.querySelector("#caixa");')
    expect(ir[0]?.type).toBe('querySelector')
  })

  it('roundtrip estável', () => {
    const ir = parseJS('const itens = document.querySelectorAll(".card");')
    expect(roundtrip(ir)).toEqual(ir)
  })
})

describe('DOM avançado — localStorage / sessionStorage', () => {
  it('parseia setItem (local e session)', () => {
    expect(parseJS('localStorage.setItem("nome", valor);')[0]).toEqual({
      type: 'storageSet',
      store: 'local',
      key: { type: 'str', value: 'nome' },
      value: { type: 'var', name: 'valor' },
    })
    expect(parseJS('sessionStorage.setItem("n", 1);')[0]).toMatchObject({
      type: 'storageSet',
      store: 'session',
    })
  })

  it('parseia getItem como valor', () => {
    const ir = parseJS('const nome = localStorage.getItem("nome");')
    expect(ir[0]).toEqual({
      type: 'var',
      name: 'nome',
      kind: 'const',
      value: { type: 'storageGet', store: 'local', key: { type: 'str', value: 'nome' } },
    })
  })

  it('gera setItem/getItem corretos', () => {
    expect(
      compileStatements(
        [
          {
            type: 'storageSet',
            store: 'local',
            key: { type: 'str', value: 'k' },
            value: { type: 'num', value: 5 },
          },
        ],
        0,
      ),
    ).toBe('localStorage.setItem("k", 5);')
  })

  it('roundtrip estável de set + get', () => {
    const ir = parseJS(
      'localStorage.setItem("contador", n);\nconst n = localStorage.getItem("contador");',
    )
    expect(roundtrip(ir)).toEqual(ir)
  })
})

describe('DOM avançado — event.preventDefault / stopPropagation', () => {
  it('parseia preventDefault e stopPropagation', () => {
    expect(parseJS('event.preventDefault();')[0]).toEqual({
      type: 'eventMethod',
      method: 'preventDefault',
    })
    expect(parseJS('event.stopPropagation();')[0]).toEqual({
      type: 'eventMethod',
      method: 'stopPropagation',
    })
  })

  it('gera event.<method>()', () => {
    expect(compileStatements([{ type: 'eventMethod', method: 'preventDefault' }], 0)).toBe(
      'event.preventDefault();',
    )
  })
})

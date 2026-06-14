import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../js'

function roundtrip(ir: JSStatement[]): JSStatement[] {
  return parseJS(compileStatements(ir, 0))
}

const FETCH_CATCH = `fetch("https://api.exemplo.com/dados")
  .then((resposta) => resposta.json())
  .then((dados) => {
    console.log(dados);
  })
  .catch((erro) => {
    console.log(erro);
  });`

const FETCH_NO_CATCH = `fetch("https://api.exemplo.com/dados")
  .then((resposta) => resposta.json())
  .then((dados) => {
    console.log(dados);
  });`

describe('fetch JSON', () => {
  it('parseia fetch com .then(json).then(dados).catch(erro)', () => {
    const ir = parseJS(FETCH_CATCH)
    expect(ir[0]).toEqual({
      type: 'fetchJson',
      url: { type: 'str', value: 'https://api.exemplo.com/dados' },
      okName: 'dados',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'dados' } }],
      catchName: 'erro',
      catchBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
    })
  })

  it('parseia fetch sem .catch', () => {
    const ir = parseJS(FETCH_NO_CATCH) as Extract<JSStatement, { type: 'fetchJson' }>[]
    expect(ir[0]?.type).toBe('fetchJson')
    expect(ir[0]?.catchBody).toBeUndefined()
  })

  it('gera a cadeia promise legível', () => {
    const code = compileStatements(
      [
        {
          type: 'fetchJson',
          url: { type: 'str', value: 'https://x.com' },
          okName: 'dados',
          body: [{ type: 'consoleLog', value: { type: 'var', name: 'dados' } }],
          catchName: 'erro',
          catchBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
        },
      ],
      0,
    )
    expect(code).toContain('fetch("https://x.com")')
    expect(code).toContain('.then((resposta) => resposta.json())')
    expect(code).toContain('.then((dados) => {')
    expect(code).toContain('.catch((erro) => {')
  })

  it('roundtrip estável (com e sem catch)', () => {
    const withCatch = parseJS(FETCH_CATCH)
    expect(roundtrip(withCatch)).toEqual(withCatch)
    const noCatch = parseJS(FETCH_NO_CATCH)
    expect(roundtrip(noCatch)).toEqual(noCatch)
  })

  it('aceita o callback json com corpo em bloco { return r.json(); }', () => {
    const code =
      'fetch("https://x.com").then((r) => { return r.json(); }).then((d) => { console.log(d); });'
    expect(parseJS(code)[0]?.type).toBe('fetchJson')
  })

  it('uma cadeia .then que NÃO é fetch-json degrada para avançado', () => {
    const code = 'algo().then((x) => { usar(x); });'
    expect(parseJS(code)[0]?.type).toBe('rawJS')
  })
})

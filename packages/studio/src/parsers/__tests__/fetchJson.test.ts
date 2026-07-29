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
    expect(code).toContain('if (!resposta.ok)')
    expect(code).toContain('throw new Error("Falha HTTP " + resposta.status)')
    expect(code).toContain('return resposta.json()')
    expect(code).toContain('.then((dados) => {')
    expect(code).toContain('.catch((erro) => {')
  })

  it.each([404, 500])('encaminha HTTP %d para o callback de erro', async (status) => {
    const code = compileStatements(
      [
        {
          type: 'fetchJson',
          url: { type: 'str', value: 'https://x.com' },
          okName: 'dados',
          body: [{ type: 'consoleLog', value: { type: 'str', value: 'sucesso' } }],
          catchName: 'erro',
          catchBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
        },
      ],
      0,
    )
    const logged: unknown[] = []
    const execute = new Function(
      'fetch',
      'console',
      `return (async () => { ${code}\nawait new Promise((resolve) => setTimeout(resolve, 0)); })();`,
    )

    await execute(async () => new Response('{"mensagem":"erro"}', { status }), {
      log: (value: unknown) => logged.push(value),
    })

    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(Error)
    expect((logged[0] as Error).message).toContain(String(status))
  })

  it('mantém sucesso, JSON inválido e falha de rede nos caminhos corretos', async () => {
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
    const execute = new Function(
      'fetch',
      'console',
      `return (async () => { ${code}\nawait new Promise((resolve) => setTimeout(resolve, 0)); })();`,
    )

    const success: unknown[] = []
    await execute(async () => new Response('{"ok":true}', { status: 200 }), {
      log: (value: unknown) => success.push(value),
    })
    expect(success).toEqual([{ ok: true }])

    for (const fetchImpl of [
      async () => new Response('{', { status: 200 }),
      async () => {
        throw new TypeError('rede indisponível')
      },
    ]) {
      const errors: unknown[] = []
      await execute(fetchImpl, { log: (value: unknown) => errors.push(value) })
      expect(errors).toHaveLength(1)
      expect(errors[0]).toBeInstanceOf(Error)
    }
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

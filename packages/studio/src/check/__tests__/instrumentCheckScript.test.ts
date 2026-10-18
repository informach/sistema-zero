import { describe, expect, test } from 'bun:test'
import { instrumentCheckScript } from '../instrumentCheckScript'

const SCOPE = '__sz0123456789abcdef01234567'

/** Roda o código instrumentado num `globalThis` próprio e devolve o leitor do teste. */
function run(source: string, globals: Record<string, unknown> = {}) {
  const realm: Record<string, unknown> = { ...globals }
  realm.globalThis = realm
  const code = instrumentCheckScript(source, SCOPE)
  new Function('globalThis', ...Object.keys(globals), code)(realm, ...Object.values(globals))
  // Lido na hora da pergunta: o leitor da partida só nasce quando a partida roda.
  return {
    get: (name: string) =>
      (realm[SCOPE] as { get(name: string): { v: unknown } | null } | undefined)?.get(name) ?? null,
  }
}

describe('o leitor de variáveis do teste', () => {
  test('lê variáveis, objetos e funções do topo do arquivo', () => {
    const reader = run(
      'let pontos = 3\nconst heroi = { x: 10 }\nfunction dobro(n) { return n * 2 }',
    )
    expect(reader.get('pontos')).toEqual({ v: 3 })
    expect(reader.get('heroi')).toEqual({ v: { x: 10 } })
    const dobro = reader.get('dobro')?.v as (n: number) => number
    expect(dobro(4)).toBe(8)
  })

  test('lê dentro da função da partida, que é onde o jogo de blocos guarda tudo', () => {
    let run2: (() => void) | undefined
    const reader = run(
      'Motor.onStart(function __szProjectRun() {\n  const heroi = { x: 20 }\n  let vidas = 3\n})',
      {
        Motor: {
          onStart(fn: () => void) {
            run2 = fn
          },
        },
      },
    )
    // A função da partida ainda não rodou: nada dela existe ainda.
    expect(reader.get('heroi')).toBeNull()
    run2?.()
    expect(reader.get('heroi')).toEqual({ v: { x: 20 } })
    expect(reader.get('vidas')).toEqual({ v: 3 })
  })

  test('a partida que roda de novo (reiniciar) passa a valer no lugar da anterior', () => {
    const source =
      'var rodadas = 0\nfunction __szProjectRun() { rodadas++; let vez = rodadas }\n__szProjectRun(); __szProjectRun()'
    const reader = run(source)
    expect(reader.get('vez')).toEqual({ v: 2 })
  })

  test('a variável ainda não criada (antes da linha do let) volta como "não existe"', () => {
    const reader = run('function __szProjectRun() { let depois = 1 }\n__szProjectRun()')
    expect(reader.get('depois')).toEqual({ v: 1 })
    // Perguntar antes da linha do `let` não derruba o jogo: a resposta é "não existe".
    const cedo = run('const a = globalThis[k].get("b")\nlet b = 2', { k: SCOPE })
    expect(cedo.get('a')).toEqual({ v: null })
    expect(cedo.get('b')).toEqual({ v: 2 })
  })

  test('não expõe os nomes internos do motor', () => {
    const reader = run(
      'function __szProjectRun() { const __szProjectRunContext = 1; const heroi = 2 }\n__szProjectRun()',
    )
    expect(reader.get('__szProjectRunContext')).toBeNull()
    expect(reader.get('heroi')).toEqual({ v: 2 })
  })

  test('o leitor fica fora da vista do jogo (não enumerável) e não pode ser trocado', () => {
    const realm: Record<string, unknown> = {}
    realm.globalThis = realm
    new Function('globalThis', instrumentCheckScript('let a = 1', SCOPE))(realm)
    expect(Object.keys(realm)).not.toContain(SCOPE)
    expect(() => {
      ;(realm as Record<string, unknown>)[SCOPE] = 1
    }).toThrow()
  })

  test('preserva a diretiva "use strict" no começo do arquivo', () => {
    const out = instrumentCheckScript("'use strict'\nlet a = 1", SCOPE)
    expect(out.startsWith("'use strict'")).toBe(true)
  })

  test('código que não analisa volta como veio (o jogo roda do mesmo jeito)', () => {
    expect(instrumentCheckScript('let = = 2 {', SCOPE)).toBe('let = = 2 {')
  })

  test('não muda o número das linhas do código da criança', () => {
    const source = 'let a = 1\nfunction __szProjectRun() {\n  let b = 2\n}\n'
    expect(instrumentCheckScript(source, SCOPE).split('\n').length).toBe(source.split('\n').length)
  })

  test('recusa um nome de escopo que não é o sorteado', () => {
    expect(() => instrumentCheckScript('let a = 1', 'window')).toThrow()
  })
})

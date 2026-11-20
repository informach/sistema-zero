import { describe, expect, it } from 'bun:test'
import {
  parsePythonCases,
  pythonCall,
  pythonCasesText,
  pythonLiteral,
  pythonTestFunctions,
} from './studentTestsPython'

/** O teste de função no Python: os casos "um por linha" e as funções do projeto. */

describe('os casos do teste de função', () => {
  it('lê o que a função recebe, a seta e a resposta, como no Python', () => {
    expect(
      parsePythonCases(
        [
          '2, 3 -> 5',
          '"Ana" -> "Olá, Ana"',
          "'x', -1.5 → [1, (2, 3)]",
          '-> True',
          '{"vidas": 3} -> None',
          '[] -> False',
        ].join('\n'),
        8,
      ),
    ).toEqual({
      cases: [
        { args: [2, 3], expected: 5 },
        { args: ['Ana'], expected: 'Olá, Ana' },
        { args: ['x', -1.5], expected: [1, [2, 3]] },
        { args: [], expected: true },
        { args: [{ vidas: 3 }], expected: null },
        { args: [[]], expected: false },
      ],
    })
  })

  it('linhas em branco não contam; sem caso, linha que não dá para ler, casos demais', () => {
    expect(parsePythonCases('\n  2 -> 4  \n\n', 8)).toEqual({ cases: [{ args: [2], expected: 4 }] })
    expect(parsePythonCases('   \n', 8)).toEqual({ problem: 'tests.form.needCases' })
    for (const ruim of ['2 4', '2 ->', '-> 4 5', '"aberto -> 1', 'nome -> 1', '2, -> 4'])
      expect(parsePythonCases(ruim, 8)).toEqual({ problem: 'tests.form.badCase' })
    expect(parsePythonCases(Array.from({ length: 9 }, () => '1 -> 1').join('\n'), 8)).toEqual({
      problem: 'tests.form.tooManyCases',
    })
  })

  it('volta ao texto da caixa e lê de novo igual', () => {
    const cases = [
      { args: [2, 'Ana'], expected: [true, null] },
      { args: [], expected: { a: 1 } },
    ]
    const text = pythonCasesText(cases)
    expect(text).toBe('2, "Ana" -> [True, None]\n-> {"a": 1}')
    expect(parsePythonCases(text, 8)).toEqual({ cases })
  })

  it('escreve valores e chamadas como no Python', () => {
    expect(pythonLiteral(false)).toBe('False')
    expect(pythonLiteral('oi "você"')).toBe('"oi \\"você\\""')
    expect(pythonCall('dobro', [2])).toBe('dobro(2)')
    expect(pythonCall('juntar', ['a', [1]])).toBe('juntar("a", [1])')
  })
})

describe('as funções que a aba oferece', () => {
  it('as de nível de cima de cada arquivo, o main.py primeiro, com o arquivo das outras', () => {
    expect(
      pythonTestFunctions({
        'util.py': 'def somar(a, b):\n    return a + b\n',
        'main.py':
          'import util\n\ndef dobro(n):\n    return n * 2\n\nclass Heroi:\n    def andar(self):\n        pass\n\ndef __init__():\n    pass\n',
        'requirements.txt': 'def nada():',
      }),
    ).toEqual([{ name: 'dobro' }, { name: 'somar', module: 'util.py' }])
    expect(pythonTestFunctions({ 'main.py': 'print(1)' })).toEqual([])
  })
})

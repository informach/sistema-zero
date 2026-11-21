import { expect, test } from 'bun:test'
import { readStudentTestResults } from '../src/lib/studio-student-tests'

/** "Meus testes" no Pro: a resposta do servidor só passa com um resultado por teste pedido. */

test('a resposta do servidor: um resultado por teste pedido, com o que o executor viu', () => {
  expect(
    readStudentTestResults(
      {
        results: [
          { id: 'a', passed: true },
          { id: 'b', passed: false, detail: 'Com (2) respondeu 7.' },
        ],
      },
      ['a', 'b'],
    ),
  ).toEqual([
    { id: 'a', passed: true },
    { id: 'b', passed: false, detail: 'Com (2) respondeu 7.' },
  ])
})

test('resposta torta, faltando teste ou com teste de fora vira a frase de não deu para rodar', () => {
  const frase = 'Não deu para rodar os testes no servidor agora. Tente de novo.'
  for (const [raw, ids] of [
    [null, ['a']],
    [{ results: 'x' }, ['a']],
    [{ results: [{ id: 'a' }] }, ['a']],
    [{ results: [{ id: 'a', passed: true }] }, ['a', 'b']],
    [{ results: [{ id: 'z', passed: true }] }, ['a']],
  ] as const)
    expect(() => readStudentTestResults(raw, ids)).toThrow(frase)
})

import { expect, test } from 'bun:test'
import { config2D } from './construtor-2d'
import { testarContratoBase } from './construtor-base-contratos-qa'
import { etapasNave, ORDEM_NAVE, projetoNave } from './nave-contra-asteroides-etapas'

testarContratoBase(config2D)

test('o comando e os marcos históricos apontam para as nove aulas reautoradas, conservando os slugs', () => {
  expect(config2D.aulas.map((lesson) => lesson.slug)).toEqual([...ORDEM_NAVE])
  const stages = etapasNave()
  expect(stages).toHaveLength(10)
  expect(projetoNave(0)).toEqual(config2D.montarProjeto('inicial'))
  for (const [index, lesson] of config2D.aulas.entries()) {
    const stage = lesson.trechos.filter((part) => part.etapa).at(-1)!.etapa!
    expect(projetoNave(index + 1)).toEqual(config2D.montarProjeto(stage))
  }
  expect(() => projetoNave(10)).toThrow()
})

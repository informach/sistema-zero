import { expect, test } from 'bun:test'
import { ilhaDoArquipelago } from '../src/sistemas/geografia-do-arquipelago'
import { LADO_DO_SETOR, malhaDistante } from '../src/sistemas/setores-do-arquipelago'

test('LOD usa as alturas publicadas sem recolocar setores ocupados pelo detalhe compilado', () => {
  const ilha = ilhaDoArquipelago('sua-ilha'),
    excluidos = new Set(['sua-ilha:0:0']),
    malha = malhaDistante(ilha, excluidos, (x, z) => 3 + x / 10 + z / 20)
  let erro = 0,
    facesNoDetalhe = 0
  for (let i = 0; i < malha.vertices.length; i += 3)
    erro = Math.max(
      erro,
      Math.abs(
        malha.vertices[i + 1]! - (3 + malha.vertices[i]! / 10 + malha.vertices[i + 2]! / 20),
      ),
    )
  expect(erro).toBeLessThan(0.0001)
  for (let i = 0; i < malha.indices.length; i += 3) {
    const ids = [malha.indices[i]!, malha.indices[i + 1]!, malha.indices[i + 2]!],
      x = ids.reduce((s, j) => s + malha.vertices[j * 3]!, 0) / 3,
      z = ids.reduce((s, j) => s + malha.vertices[j * 3 + 2]!, 0) / 3
    if (x > 0 && x < LADO_DO_SETOR && z > 0 && z < LADO_DO_SETOR) facesNoDetalhe++
  }
  expect(facesNoDetalhe).toBe(0)
})

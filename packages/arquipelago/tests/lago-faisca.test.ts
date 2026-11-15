import { expect, test } from 'bun:test'
import { dentroDaAgua } from '../src/sistemas/agua'
import { ilhaDoArquipelago } from '../src/sistemas/geografia-do-arquipelago'
import { LAGO_DA_FAISCA, pontoNoContorno } from '../src/sistemas/lago-da-faisca'
import { superficieDaAgua } from '../src/sistemas/modos/chao'
import { malhaDoSetor } from '../src/sistemas/setores-do-arquipelago'

test('água segue o contorno do GLB, mantendo o contrato de elipse fora do recorte', () => {
  const a = LAGO_DA_FAISCA.agua
  expect(dentroDaAgua(a, 58, 127)).toBe(true)
  expect(dentroDaAgua(a, 65, 127)).toBe(false)
  expect(superficieDaAgua([a], 0, 58, 127)).toBeCloseTo(3.85, 5)
  const e = { x: 0, z: 0, raioX: 4, raioZ: 2, giro: 0 }
  expect(dentroDaAgua(e, 3.9, 0)).toBe(true)
  expect(dentroDaAgua(e, 0, 2.1)).toBe(false)
})
test('o terreno físico não atravessa o furo catalogado do lago', () => {
  const m = malhaDoSetor(ilhaDoArquipelago('sua-ilha'), 0, 1, 4, true)
  let junto = 0
  for (let i = 0; i < m.indices.length; i += 3) {
    const ids = [0, 1, 2].map((j) => m.indices[i + j]! * 3)
    const x = ids.reduce((s, k) => s + m.vertices[k]!, 0) / 3,
      z = ids.reduce((s, k) => s + m.vertices[k + 2]!, 0) / 3
    expect(pontoNoContorno(LAGO_DA_FAISCA.furo, x, z)).toBe(false)
    if (Math.hypot(x - 58, z - 127) < 12) junto++
  }
  expect(junto).toBeGreaterThan(10)
})

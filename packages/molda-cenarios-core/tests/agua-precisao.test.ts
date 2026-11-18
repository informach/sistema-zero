import { expect, test } from 'bun:test'
import { nivelDeTransbordo } from '../src/v2/agua-do-terreno'
import { criarCampoDeAlturas } from '../src/v2/campo-de-alturas'

const campo = () =>
  criarCampoDeAlturas(
    { origem: { x: 0, z: 0 }, colunas: 64, linhas: 64, passo: 1, min: 9990, max: 10000 },
    9999.123456789,
  )
test('o teto da bacia preserva a precisão das alturas carregadas, inclusive próximo de 10 km', () => {
  const c = campo(),
    borda = c.alturas[0]!
  c.alturas[32 * 65 + 32] = 9991
  const transbordo = nivelDeTransbordo(c, { x: 32, z: 32 })
  expect(transbordo?.nivel).toBe(borda)
  expect(transbordo!.nivel).toBeGreaterThan(9991)
})
test('o orçamento da busca de transbordo recusa NaN, infinito e valores não inteiros', () => {
  for (const maxAmostras of [NaN, Infinity, 0, -1, 1.5, 20_000_000]) {
    expect(() => nivelDeTransbordo(campo(), { x: 32, z: 32 }, { maxAmostras })).toThrow()
  }
})

import { expect, test } from 'bun:test'
import { tabuasDaPonte } from '../src/mundo/colisao-da-ilha-central'
import { fracaoMontada, ilhasEmVolta, TRECHO_QUEBRADO, trajetoDaPonte } from '../src/mundo/medidas'

test('a ponte que abre cresce do fim do trecho quebrado, sem sumir o que já estava lá', () => {
  expect(fracaoMontada(false, 0)).toBe(TRECHO_QUEBRADO)
  expect(fracaoMontada(false, 1)).toBe(TRECHO_QUEBRADO)
  expect(fracaoMontada(true, 0)).toBe(TRECHO_QUEBRADO)
  expect(fracaoMontada(true, 1)).toBe(1)
  expect(fracaoMontada(true, 2)).toBe(1)
  let antes = 0
  for (let c = 0; c <= 1.0001; c += 0.05) {
    const f = fracaoMontada(true, c)
    expect(f).toBeGreaterThanOrEqual(antes)
    antes = f
  }
})

test('no começo da montagem, as tábuas e o chão da ponte são os mesmos da ponte fechada', () => {
  for (const { ilha } of ilhasEmVolta()) {
    const pontos = trajetoDaPonte(ilha, 36)
    const tabuas = tabuasDaPonte(pontos)
    const fechada = Math.floor(tabuas.length * fracaoMontada(false, 0))
    expect(Math.floor(tabuas.length * fracaoMontada(true, 0))).toBe(fechada)
    expect(Math.floor((pontos.length - 1) * fracaoMontada(true, 0))).toBe(
      Math.floor((pontos.length - 1) * TRECHO_QUEBRADO),
    )
    expect(fechada).toBeGreaterThan(0)
  }
})

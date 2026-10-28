import { expect, test } from 'bun:test'
import {
  criarOndas,
  criarRastroNaAgua,
  passoDasOndas,
  passoDoGalho,
  rastroNaAgua,
  TOTAL_DE_ONDAS,
  VIDA_DA_ONDA,
} from '../src/sistemas/mundo-reativo'

test('água reage à entrada e à passagem, sem emitir ondas parado ou em terra', () => {
  const ondas = criarOndas(),
    r = criarRastroNaAgua()
  rastroNaAgua(ondas, r, false, 0, 0, 1 / 60)
  expect(ondas.emitidas).toBe(0)
  rastroNaAgua(ondas, r, true, 0, 0, 1 / 60)
  expect(ondas.emitidas).toBe(1)
  for (let i = 0; i < 120; i++) rastroNaAgua(ondas, r, true, 0, 0, 1 / 60)
  expect(ondas.emitidas).toBe(1)
  for (let i = 0; i < 60; i++) rastroNaAgua(ondas, r, true, i / 60, 0, 1 / 60)
  expect(ondas.emitidas).toBeGreaterThan(2)
  expect(ondas.emitidas).toBeLessThanOrEqual(5)
})
test('ondas usam sempre o mesmo conjunto e desaparecem', () => {
  const ondas = criarOndas(),
    referencias = [...ondas.lista],
    r = criarRastroNaAgua()
  for (let i = 0; i < 2000; i++) {
    passoDasOndas(ondas, 1 / 60)
    rastroNaAgua(ondas, r, true, i / 20, 0, 1 / 60)
  }
  expect(ondas.lista.length).toBe(TOTAL_DE_ONDAS)
  for (let i = 0; i < TOTAL_DE_ONDAS; i++) expect(ondas.lista[i]).toBe(referencias[i])
  passoDasOndas(ondas, 2)
  expect(ondas.lista.every((o) => o.idade === VIDA_DA_ONDA)).toBe(true)
})
test('galho só quebra com peso sustentado e só dispara uma troca', () => {
  const galho = { carga: 0, quebrado: false }
  for (let i = 0; i < 100; i++) expect(passoDoGalho(galho, false, 1 / 60)).toBe(false)
  expect(passoDoGalho(galho, true, 1 / 60)).toBe(false)
  passoDoGalho(galho, false, 1 / 60)
  let trocas = 0
  for (let i = 0; i < 60; i++) if (passoDoGalho(galho, true, 1 / 60)) trocas++
  expect(trocas).toBe(1)
  expect(galho.quebrado).toBe(true)
})

import { afterEach, describe, expect, test } from 'bun:test'
import {
  BORROES_A_VISTA,
  corQueSobra,
  FORCA_DO_CINZA,
  marcarBorrao,
  RAIO_DO_CINZA,
  soltarBorrao,
} from '../src/mundo/cinza-dos-borroes'
import { MANCHA_DO_BORRAO } from '../src/sistemas/borroes'

/**
 * Os borrões desbotam o que está em volta (lacunas, 01/11/2026; a proposta: "à noite, borrões de
 * névoa saem para desbotar o que está do lado de fora"). A conta do shader, repetida no código.
 */
describe('o Cinza em volta dos borrões', () => {
  const ids = Array.from({ length: BORROES_A_VISTA + 1 }, (_, i) => `b${i}`)
  afterEach(() => {
    for (const id of ids) soltarBorrao(id)
  })

  test('perto do borrão a cor some quase toda; longe dele, nada muda', () => {
    marcarBorrao('b0', 10, 10, 1)
    expect(corQueSobra(10, 10)).toBeCloseTo(1 - FORCA_DO_CINZA, 5)
    expect(corQueSobra(10 + RAIO_DO_CINZA + 0.1, 10)).toBe(1)
    // Vai voltando aos poucos entre o meio e a borda.
    const meio = corQueSobra(10 + RAIO_DO_CINZA * 0.65, 10)
    expect(meio).toBeGreaterThan(1 - FORCA_DO_CINZA)
    expect(meio).toBeLessThan(1)
    // Desbota mais que a mancha do chão.
    expect(RAIO_DO_CINZA).toBeGreaterThan(MANCHA_DO_BORRAO.raio)
  })

  test('cresce com a mancha e some quando o borrão sai', () => {
    marcarBorrao('b0', 0, 0, 0.5)
    const metade = corQueSobra(0, 0)
    marcarBorrao('b0', 0, 0, 1)
    expect(corQueSobra(0, 0)).toBeLessThan(metade)
    soltarBorrao('b0')
    expect(corQueSobra(0, 0)).toBe(1)
  })

  test('dois borrões juntos desbotam mais; sem vaga, o seguinte não desbota', () => {
    marcarBorrao('b0', 0, 0, 1)
    const um = corQueSobra(0.5, 0)
    marcarBorrao('b1', 1, 0, 1)
    expect(corQueSobra(0.5, 0)).toBeLessThan(um)
    for (const id of ids.slice(2, BORROES_A_VISTA)) marcarBorrao(id, 50, 50, 1)
    marcarBorrao(ids[BORROES_A_VISTA]!, -50, -50, 1)
    expect(corQueSobra(-50, -50)).toBe(1)
  })

  test('um borrão novo sem força não toma vaga', () => {
    marcarBorrao('b0', 3, 3, 0)
    expect(corQueSobra(3, 3)).toBe(1)
  })
})

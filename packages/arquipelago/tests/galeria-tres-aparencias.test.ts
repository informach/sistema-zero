import { describe, expect, test } from 'bun:test'
import { GALERIA, IDS_DA_GALERIA, OBJETOS_DA_CASA } from '@sistemazero/arquipelago-contracts'
import { miniaturaDaAparencia } from '../src/interface/miniaturas'
import { modeloComAparencia } from '../src/mundo/objetos-da-casa'

/**
 * As três aparências de cada objeto da galeria no jogo (B8, 31/10/2026): a clássica, a retrô e a
 * moderna, cada uma com o próprio modelo e a própria miniatura.
 */
describe('a galeria com a clássica, a retrô e a moderna', () => {
  test('cada aparência da galeria abre o modelo dela', () => {
    for (const objeto of OBJETOS_DA_CASA) {
      const classico = modeloComAparencia(objeto, null)
      const urls = IDS_DA_GALERIA.filter((id) => GALERIA[id].objeto === objeto).map((id) =>
        modeloComAparencia(objeto, { origem: 'galeria', id }),
      )
      expect(urls[0]).toBe(classico)
      expect(new Set(urls).size).toBe(3)
      expect(urls[1]).toContain(`${objeto}-retro`)
      expect(urls[2]).toContain(`${objeto}-moderna`)
    }
  })

  test('aparência de outro objeto, desconhecida ou feita por ela fica no modelo clássico', () => {
    const classico = modeloComAparencia('forno', null)
    expect(modeloComAparencia('forno', { origem: 'galeria', id: 'geladeira-retro' })).toBe(classico)
    expect(modeloComAparencia('forno', { origem: 'galeria', id: 'forno-dourado' })).toBe(classico)
    expect(modeloComAparencia('forno', { origem: 'pinta', id: 'forno-retro' })).toBe(classico)
  })

  test('cada aparência tem a própria miniatura', () => {
    const miniaturas = IDS_DA_GALERIA.map(miniaturaDaAparencia)
    expect(new Set(miniaturas).size).toBe(IDS_DA_GALERIA.length)
  })
})

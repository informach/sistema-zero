import { describe, expect, test } from 'bun:test'
import { criarRegistro, maisPerto } from '../src/mundo/interativos'

describe('o interativo mais perto', () => {
  const nada = () => undefined
  test('o de fundo (o bicho adotado) só vale sem outro ao alcance', () => {
    const r = criarRegistro()
    r.set('capi', { x: 2, z: 0, raio: 2.2, rotulo: () => 'Conversar com a Capi', agir: nada })
    r.set('bicho', {
      x: 0.5,
      z: 0,
      raio: 1.9,
      deFundo: true,
      rotulo: () => 'Cuidar de Pipoca',
      agir: nada,
    })
    // O bicho está mais perto, mas a Capi está ao alcance: o E é dela.
    expect(maisPerto(r, 0, 0)?.id).toBe('capi')
    // Longe da Capi, o bicho volta a ter o E.
    expect(maisPerto(r, -1, 0)?.id).toBe('bicho')
  })

  test('sem rótulo ou fora do alcance não conta', () => {
    const r = criarRegistro()
    r.set('porta', { x: 0, z: 0, raio: 1, rotulo: () => null, agir: nada })
    r.set('horta', { x: 5, z: 0, raio: 1, rotulo: () => 'Plantar', agir: nada })
    expect(maisPerto(r, 0, 0)).toBeNull()
  })
})

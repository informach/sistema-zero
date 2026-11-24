import { expect, test } from 'bun:test'
import {
  aplicarFerramentaDeTerreno,
  clonarEstadoDoTerreno,
  criarBuracos,
  criarCampoDeAlturas,
  criarPinturaDeChao,
  ParametrosDeTerrenoSchema,
} from '../src/v2'

const criar = () => {
  const forma = {
    origem: { x: -32, z: -32 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: -20,
    max: 100,
  }
  return {
    campo: criarCampoDeAlturas(forma),
    pintura: criarPinturaDeChao(forma, 2),
    buracos: criarBuracos(forma),
  }
}
const centro = 32 * 65 + 32,
  ponto = { x: 0, y: 9, z: 0 }
test('aplainar usa a altura capturada no início e nivelar usa a altura digitada', () => {
  const e = criar()
  e.campo.alturas.fill(8)
  aplicarFerramentaDeTerreno(
    e,
    ParametrosDeTerrenoSchema.parse({ ferramenta: 'aplainar', forca: 1 }),
    ponto,
    { ...ponto, y: 2 },
  )
  expect(e.campo.alturas[centro]).toBe(2)
  aplicarFerramentaDeTerreno(
    e,
    ParametrosDeTerrenoSchema.parse({ ferramenta: 'nivelar', forca: 1, altura: 7 }),
    ponto,
  )
  expect(e.campo.alturas[centro]).toBe(7)
  expect(e.campo.alturas[0]).toBe(8)
})
test('rampa lê as duas alturas originais; ponto único é uma prévia sem alteração', () => {
  const e = criar(),
    parametros = ParametrosDeTerrenoSchema.parse({ ferramenta: 'rampa', largura: 4 })
  expect(aplicarFerramentaDeTerreno(e, parametros, ponto)).toEqual({})
  aplicarFerramentaDeTerreno(e, parametros, { x: 10, y: 5, z: 0 }, { x: -10, y: 1, z: 0 })
  expect(e.campo.alturas[centro]).toBeCloseTo(3, 8)
  expect(e.campo.alturas[centro + 10]).toBe(5)
  expect(e.campo.alturas[centro - 10]).toBe(1)
})
test('pintura e abertura são dados separados das alturas, e fechar restaura as células', () => {
  const e = criar(),
    original = clonarEstadoDoTerreno(e)
  aplicarFerramentaDeTerreno(
    e,
    ParametrosDeTerrenoSchema.parse({ ferramenta: 'pintar', camada: 1, forca: 1 }),
    ponto,
  )
  expect(e.pintura.pesos[centro * 2]).toBe(0)
  expect(e.pintura.pesos[centro * 2 + 1]).toBe(255)
  aplicarFerramentaDeTerreno(e, ParametrosDeTerrenoSchema.parse({ ferramenta: 'furar' }), ponto)
  expect(e.buracos.celulas[32 * 64 + 32]).toBe(1)
  aplicarFerramentaDeTerreno(e, ParametrosDeTerrenoSchema.parse({ ferramenta: 'fechar' }), ponto)
  expect(e.buracos.celulas.every((v) => v === 0)).toBe(true)
  expect(e.campo.alturas).toEqual(original.campo.alturas)
  expect(original.pintura.pesos[centro * 2]).toBe(255)
})
test('ruído conserva a semente no mesmo pipeline usado pelo gesto e valores inválidos são recusados', () => {
  const a = criar(),
    b = criar(),
    parametros = ParametrosDeTerrenoSchema.parse({ ferramenta: 'ruido', semente: 123, metros: 5 })
  aplicarFerramentaDeTerreno(a, parametros, ponto)
  aplicarFerramentaDeTerreno(b, parametros, ponto)
  expect(a.campo.alturas).toEqual(b.campo.alturas)
  expect(a.campo.alturas.some((v) => v !== 0)).toBe(true)
  expect(() => ParametrosDeTerrenoSchema.parse({ ferramenta: 'ruido', raio: NaN })).toThrow()
  expect(() => ParametrosDeTerrenoSchema.parse({ ferramenta: 'pintar', camada: 8 })).toThrow()
})

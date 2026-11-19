import { expect, test } from 'bun:test'
import { type BaseDeTerreno, criarCampoDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import { AlturasDaAgua, paginarAlturasDaAgua } from '../src/agua/alturas'
import { MaterialDaAgua } from '../src/agua/material'

test('a grade máxima cabe em páginas reais do dispositivo sem perder amostras ou passar de sua dimensão', () => {
  for (const max of [2048, 4096, 8192]) {
    const paginas = paginarAlturasDaAgua(4097 ** 2, max)
    expect(paginas.length).toBeLessThanOrEqual(2)
    expect(paginas.reduce((n, p) => n + p.quantidade, 0)).toBe(4097 ** 2)
    for (const p of paginas) {
      expect(p.largura).toBeLessThanOrEqual(max)
      expect(p.altura).toBeLessThanOrEqual(max)
      expect(p.inicio % 4).toBe(0)
    }
  }
  expect(() => paginarAlturasDaAgua(4097 ** 2 + 1, 2048)).toThrow()
  expect(() => paginarAlturasDaAgua(100, NaN)).toThrow()
})

test('mapa compartilha alturas, atualiza só a região RGBA e distingue peças sem altura própria', () => {
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    origem: { x: 10, z: 20 },
    colunas: 128,
    linhas: 64,
    passo: 1,
    min: 9990,
    max: 10000,
    fundo: 9992,
    pecas: [],
  }
  const campo = criarCampoDeAlturas(base, 9999.123456789),
    mapa = new AlturasDaAgua(base, campo, 2048, (x) => x === 0)
  try {
    const p = mapa.paginas[0]!,
      antes = p.dados.slice()
    expect(p.dados[0]).toBe(Math.fround(9999.123456789))
    expect(mapa.dadosDasPecas[0]).toBe(255)
    expect(mapa.dadosDasPecas[4]).toBe(0)
    // O primeiro envio precisa ser integral mesmo se a prévia mudar antes do primeiro quadro.
    mapa.atualizar(campo, { x0: 3, x1: 3, z0: 0, z1: 0 })
    expect(p.textura.updateRanges).toEqual([])
    for (const p of mapa.paginas) p.textura.onUpdate?.(p.textura)
    campo.alturas[3] = 9991
    mapa.atualizar(campo, { x0: 3, x1: 3, z0: 0, z1: 0 })
    expect(p.dados[3]).toBe(9991)
    expect(p.dados[2]).toBe(antes[2]!)
    expect(p.dados[4]).toBe(antes[4]!)
    expect(p.textura.updateRanges).toEqual([{ start: 0, count: 4 }])
    mapa.definirPecas(() => true)
    expect(mapa.dadosDasPecas[4]).toBe(255)
  } finally {
    mapa.descartar()
  }
})

test('compilação separa layouts de textura e fundo por vértice sem duplicar o mapa compartilhado', () => {
  const base: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: 0, z: 0 },
      colunas: 64,
      linhas: 64,
      passo: 1,
      min: -10,
      max: 10,
      fundo: 0,
      pecas: [],
    },
    maior = { ...base, colunas: 128 },
    a = new AlturasDaAgua(base, criarCampoDeAlturas(base), 2048, () => true),
    b = new AlturasDaAgua(maior, criarCampoDeAlturas(maior), 2048, () => true),
    m = new MaterialDaAgua(undefined, { fundo: a, profundidade: 4 }),
    n = new MaterialDaAgua(undefined, { fundo: b, profundidade: 4 }),
    p = new MaterialDaAgua(undefined, {
      fundo: null,
      profundidade: 4,
      profundidadePorVertice: true,
    }),
    q = new MaterialDaAgua(undefined, { fundo: null, profundidade: 4 })
  try {
    expect(m.material.customProgramCacheKey()).not.toBe(n.material.customProgramCacheKey())
    expect(p.material.customProgramCacheKey()).not.toBe(q.material.customProgramCacheKey())
    const textura = a.paginas[0]!.textura
    let descartada = false
    textura.addEventListener('dispose', () => {
      descartada = true
    })
    m.descartar()
    expect(descartada).toBe(false)
  } finally {
    m.descartar()
    n.descartar()
    p.descartar()
    q.descartar()
    a.descartar()
    b.descartar()
  }
})

test('consulta portátil lê páginas Float32, diagonal, atualização e cobertura do mesmo mapa GPU', () => {
  const b: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: 10, z: 20 },
      colunas: 128,
      linhas: 64,
      passo: 1,
      min: -10,
      max: 100,
      fundo: -2,
      pecas: [],
    },
    campo = criarCampoDeAlturas(b),
    mapa = new AlturasDaAgua(b, campo, 32, (x) => x === 0)
  try {
    campo.alturas[0] = 0
    campo.alturas[1] = 10
    campo.alturas[129] = 20
    campo.alturas[130] = 100
    mapa.atualizar(campo)
    expect(mapa.paginas.length).toBeGreaterThan(1)
    expect(mapa.alturaEm(10.25, 20.25)).toBe(7.5)
    expect(mapa.alturaEm(10.75, 20.75)).toBe(57.5)
    expect(mapa.alturaEm(74, 20)).toBe(-2)
    expect(mapa.alturaEm(-1, -1)).toBe(-2)
    campo.alturas[64 * 129] = 12.123456789
    mapa.atualizar(campo)
    expect(mapa.alturaEm(10, 84)).toBe(Math.fround(12.123456789))
    mapa.definirPecas(() => false)
    expect(mapa.alturaEm(10.25, 20.25)).toBe(-2)
  } finally {
    mapa.descartar()
  }
  expect(() => mapa.alturaEm(10, 20)).toThrow(/descartado/)
})

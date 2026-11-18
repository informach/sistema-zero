import { expect, test } from 'bun:test'
import { Color } from 'three'
import { MaterialDaAgua } from '../src/agua/material'

test('albedo portátil conserva atenuação por profundidade e opacidade, antes da iluminação', () => {
  const m = new MaterialDaAgua(
      {
        corRasa: '#ffffff',
        corProfunda: '#000000',
        opacidadeRasa: 0.2,
        opacidadeProfunda: 0.8,
        profundidadeDeCor: 4,
        espuma: { largura: 0, intensidade: 0, cor: '#ffffff' },
        ondas: { altura: 0, comprimento: 3, velocidade: 0 },
      },
      { fundo: null, profundidade: 4 },
    ),
    out = new Float64Array(4)
  try {
    m.amostrarEstatico({ x: 0, y: 1, z: 0 }, 0, undefined, out)
    for (const c of [0, 1, 2]) expect(out[c]).toBeCloseTo(Math.exp(-1), 12)
    expect(out[3]).toBeCloseTo(0.2 + 0.6 * (1 - Math.exp(-1)), 12)
    m.atualizar(100, false)
    const antes = out.slice()
    m.amostrarEstatico({ x: 0, y: 1, z: 0 }, 0, undefined, out)
    expect(out).toEqual(antes)
  } finally {
    m.descartar()
  }
})
test('borda seca, fade de margem e espuma seguem a profundidade real sobre um plano', () => {
  const m = new MaterialDaAgua(
      {
        corRasa: '#000000',
        corProfunda: '#000000',
        opacidadeRasa: 1,
        opacidadeProfunda: 1,
        profundidadeDeCor: 4,
        espuma: { largura: 1, intensidade: 1, cor: '#ffffff' },
        ondas: { altura: 0, comprimento: 3, velocidade: 0 },
      },
      { fundo: null, plano: 0, profundidade: 100 },
    ),
    out = new Float64Array(4)
  try {
    m.amostrarEstatico({ x: 0, y: 0.0005, z: 0 }, 0, undefined, out)
    expect(out[3]).toBe(0)
    m.amostrarEstatico({ x: 0, y: 0.02, z: 0 }, 0, undefined, out)
    expect(out[3]).toBeCloseTo(0.5, 12)
    m.amostrarEstatico({ x: 0, y: 0.5, z: 0 }, 0, undefined, out)
    expect(out[0]).toBeCloseTo(0.5, 12)
    expect(out[3]).toBe(1)
  } finally {
    m.descartar()
  }
})
test('água de catálogo exige profundidade interpolada e cachoeira congela os fios no instante zero', () => {
  const m = new MaterialDaAgua(undefined, {
      fundo: null,
      profundidade: 4,
      profundidadePorVertice: true,
    }),
    queda = new MaterialDaAgua(
      {
        corRasa: '#ffffff',
        corProfunda: '#ffffff',
        opacidadeRasa: 1,
        opacidadeProfunda: 1,
        profundidadeDeCor: 4,
        espuma: { largura: 0, intensidade: 0, cor: '#ffffff' },
        ondas: { altura: 0, comprimento: 3, velocidade: 0 },
      },
      { fundo: null, profundidade: 1, movimento: 'queda', largura: 2 },
    ),
    out = new Float64Array(4)
  try {
    expect(() => m.amostrarEstatico({ x: 0, y: 1, z: 0 }, 0, undefined, out)).toThrow(
      /profundidade/,
    )
    m.amostrarEstatico({ x: 0, y: 100, z: 0 }, 0, 4, out)
    const rasa = new Color('#78c7cb'),
      profunda = new Color('#286c8e'),
      mistura = 1 - Math.exp(-1)
    expect(out[0]).toBeCloseTo(rasa.r + (profunda.r - rasa.r) * mistura, 12)
    queda.amostrarEstatico({ x: 0, y: 1, z: 0 }, 0, undefined, out)
    expect(out[0]).toBeCloseTo(0.94, 12)
    expect(out[3]).toBeCloseTo(0.94, 12)
  } finally {
    m.descartar()
    queda.descartar()
  }
})

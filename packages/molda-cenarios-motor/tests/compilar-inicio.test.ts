import { expect, test } from 'bun:test'
import { Matrix4, PlaneGeometry, Vector3 } from 'three'
import { resolverInicioDaCena } from '../src/compilar/inicio'
import { MundoDoTeste } from '../src/teste/colisoes'

test('a chegada prioriza o início principal e conserva posição e giro autorados', () => {
  const mundo = new MundoDoTeste([])
  try {
    const comum = { nome: 'Entrada', objeto: null, giro: 0.7, posicao: { x: 10, y: 2, z: -8 } },
      marcadores = [
        { ...comum, id: 'secundario', configuracao: { tipo: 'inicio' as const, principal: false } },
        {
          ...comum,
          id: 'principal',
          configuracao: { tipo: 'inicio' as const, principal: true },
          posicao: { x: -12, y: 3, z: 7 },
        },
      ],
      resultado = resolverInicioDaCena({ dados: { nos: [], marcadores }, colisoes: mundo })
    expect(resultado.marcador).toBe('principal')
    expect(resultado.posicao).toEqual(new Vector3(-12, 3, 7))
    expect(resultado.giro).toBe(0.7)
    expect(
      resolverInicioDaCena({
        dados: { nos: [], marcadores: marcadores.slice(0, 1) },
        colisoes: mundo,
      }).marcador,
    ).toBe('secundario')
  } finally {
    mundo.descartar()
  }
})

test('sem marcador, a chegada encontra a superfície física no centro da cena', () => {
  const geometria = new PlaneGeometry(20, 20),
    mundo = new MundoDoTeste([
      { geometria, matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 3, 0) },
    ])
  try {
    const r = resolverInicioDaCena({
      dados: {
        marcadores: [],
        nos: [{ volume: { min: { x: -10, y: 0, z: -10 }, max: { x: 10, y: 7, z: 10 } } }],
      },
      colisoes: mundo,
    })
    expect(r.posicao.x).toBe(0)
    expect(r.posicao.z).toBe(0)
    expect(r.posicao.y).toBeCloseTo(3)
    expect(r.marcador).toBeNull()
  } finally {
    mundo.descartar()
    geometria.dispose()
  }
})

test('um objeto remoto não desloca a chegada para fora do terreno fora da origem', () => {
  const geometria = new PlaneGeometry(64, 64),
    mundo = new MundoDoTeste([
      { geometria, matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(132, 0, -58) },
    ])
  try {
    const r = resolverInicioDaCena({
      dados: {
        marcadores: [],
        nos: [{ volume: { min: { x: 0, y: 0, z: -90 }, max: { x: 164, y: 1, z: 0 } } }],
        terreno: { origem: { x: 100, z: -90 }, passo: 1, colunas: 64, linhas: 64 },
      },
      colisoes: mundo,
    })
    expect(r.posicao.x).toBe(132)
    expect(r.posicao.z).toBe(-58)
    expect(r.posicao.y).toBeCloseTo(0, 8)
  } finally {
    mundo.descartar()
    geometria.dispose()
  }
})

test('a cena vazia conserva a origem como referência, sem inventar um piso físico', () => {
  const mundo = new MundoDoTeste([])
  try {
    const r = resolverInicioDaCena({ dados: { nos: [], marcadores: [] }, colisoes: mundo })
    expect(r.posicao).toEqual(new Vector3())
    expect(mundo.rastrear(new Vector3(0, 1, 0), new Vector3(0, -1, 0))).toBeNull()
  } finally {
    mundo.descartar()
  }
})

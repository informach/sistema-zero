import { expect, test } from 'bun:test'
import {
  AguaSchema,
  type BaseDeTerreno,
  criarCampoDeAlturas,
} from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4, PlaneGeometry } from 'three'
import { AlturasDaAgua } from '../src/agua/alturas'
import { geometriaDaAgua } from '../src/agua/geometria'
import { MaterialDaAgua } from '../src/agua/material'
import { rasterizarAguaCompilada } from '../src/compilar/agua'

test('pintura de água conserva gradiente real de profundidade e descarta margem seca', () => {
  const base: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: -32, z: -32 },
      passo: 1,
      colunas: 64,
      linhas: 64,
      min: -100,
      max: 100,
      fundo: -10,
      pecas: [],
    },
    campo = criarCampoDeAlturas(base),
    g = new PlaneGeometry(4, 4).rotateX(-Math.PI / 2).translate(0, 1, 0)
  for (let z = 0; z <= 64; z++) for (let x = 0; x <= 64; x++) campo.alturas[z * 65 + x] = x - 32
  const alturas = new AlturasDaAgua(base, campo, 128, () => true),
    material = new MaterialDaAgua(undefined, { fundo: alturas, profundidade: 4 }),
    antes = g.getAttribute('position').array.slice()
  try {
    const r = rasterizarAguaCompilada(
        { geometria: g, matriz: new Matrix4(), acabamento: material },
        { pixelsPorMetro: 16 },
      ),
      pixel = (x: number) => (32 * 64 + x) * 4
    expect([r.largura, r.altura]).toEqual([64, 64])
    expect(r.pixels[pixel(4) + 3]).toBeGreaterThan(r.pixels[pixel(40) + 3]!)
    expect(r.pixels[pixel(56) + 3]).toBe(0)
    expect(r.pixels[pixel(4)]).not.toBe(r.pixels[pixel(40)])
    expect(r.uvs.length).toBe(g.getAttribute('position').count * 2)
    expect(g.getAttribute('position').array).toEqual(antes)
  } finally {
    material.descartar()
    alturas.descartar()
    g.dispose()
  }
})

test('cachoeira usa a faixa vertical e conserva os UVs autorais da fonte', () => {
  const a = AguaSchema.parse({
      id: 'q',
      nome: 'Queda',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'cachoeira',
      topo: { x: 0, y: 5, z: 0 },
      base: { x: 0, y: 0, z: 0 },
      giro: 0,
      largura: 2,
    }),
    g = geometriaDaAgua(a, { tipo: 'plano', largura: 32, comprimento: 32 }),
    material = new MaterialDaAgua(undefined, {
      fundo: null,
      profundidade: 1,
      movimento: 'queda',
      largura: 2,
    }),
    uv = g.geometria.getAttribute('uv').array.slice()
  try {
    const r = rasterizarAguaCompilada(
      {
        geometria: g.geometria,
        matriz: new Matrix4().makeTranslation(g.origem.x, g.origem.y, g.origem.z),
        acabamento: material,
        larguraDaQueda: 2,
      },
      { pixelsPorMetro: 8 },
    )
    expect([r.largura, r.altura]).toEqual([16, 40])
    expect(r.pixels.some((v) => v !== 0)).toBe(true)
    expect(g.geometria.getAttribute('uv').array).toEqual(uv)
    const c = new AbortController()
    c.abort()
    expect(() =>
      rasterizarAguaCompilada(
        { geometria: g.geometria, matriz: new Matrix4(), acabamento: material, larguraDaQueda: 2 },
        { sinal: c.signal },
      ),
    ).toThrow()
  } finally {
    material.descartar()
    g.geometria.dispose()
  }
})

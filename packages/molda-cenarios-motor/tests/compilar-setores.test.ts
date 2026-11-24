import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  lerRecursoDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import { Box3, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import { particionarTerrenoCompilado } from '../src/compilar/setores'
import { TerrenoDoPalco } from '../src/Terreno'

function exemplo(detalhado = false) {
  const digest = 'a'.repeat(64),
    base: BaseDeTerreno = {
      tipo: 'terreno',
      cobertura: 'grade',
      origem: { x: -99999.875, z: 34567.375 },
      passo: 0.25,
      colunas: 128,
      linhas: 128,
      min: -10,
      max: 20,
      fundo: -2,
      pecas: detalhado ? [{ coluna: 0, linha: 0, digest }] : [],
      solo: { camadas: [{ id: 'grama', nome: 'Grama', cor: '#a4d48c' }], pecas: [] },
    },
    recursos = new Map([
      [
        digest,
        lerRecursoDeTerreno(
          codificarPecaDeAlturas(
            Float64Array.from({ length: AMOSTRAS_DA_PECA }, (_, i) => 1 + (i % 65) / 64),
            -10,
            20,
          ),
        ),
      ],
    ])
  return new TerrenoDoPalco(base, recursos)
}
function triangulos(g: BufferGeometry, m: Matrix4) {
  const p = g.getAttribute('position'),
    indices = g.index,
    n = indices?.count ?? p.count,
    saida: string[] = []
  for (let i = 0; i < n; i += 3) {
    const cantos: string[] = []
    for (let j = 0; j < 3; j++) {
      const id = indices?.getX(i + j) ?? i + j,
        v = new Vector3().fromBufferAttribute(p, id).applyMatrix4(m),
        extras = Object.entries(g.attributes)
          .filter(([nome]) => nome !== 'position')
          .flatMap(([nome, a]) => [
            nome,
            ...Array.from({ length: a.itemSize }, (_, c) => a.getComponent(id, c).toFixed(6)),
          ])
      cantos.push(`${[...v].map((n) => n.toFixed(6)).join(',')}:${extras.join(',')}`)
    }
    // Conserva ordem cíclica e winding, permitindo só a troca do canto inicial.
    saida.push(
      [
        cantos.join('|'),
        [cantos[1], cantos[2], cantos[0]].join('|'),
        [cantos[2], cantos[0], cantos[1]].join('|'),
      ].sort()[0]!,
    )
  }
  return saida.sort()
}
for (const detalhado of [false, true])
  test(`setores conservam triângulos/atributos do ${detalhado ? 'terreno detalhado e piso' : 'piso simplificado de quatro peças'}`, () => {
    const t = exemplo(detalhado),
      saida: ReturnType<typeof particionarTerrenoCompilado> = []
    try {
      const fontes = t.fontesDoTeste(),
        antes = fontes.map((f) => f.geometria.getAttribute('position').array.slice()),
        esperados: string[] = []
      for (const f of fontes) {
        esperados.push(...triangulos(f.geometria, f.matriz))
        saida.push(...particionarTerrenoCompilado(f, t.base))
      }
      expect(new Set(saida.map((p) => `${p.coluna}/${p.linha}`)).size).toBe(4)
      expect(saida.flatMap((p) => triangulos(p.geometria, p.matriz)).sort()).toEqual(
        esperados.sort(),
      )
      for (const p of saida) {
        const caixa = new Box3().setFromBufferAttribute(
          p.geometria.getAttribute('position') as BufferAttribute,
        )
        expect(caixa.min.x).toBeGreaterThanOrEqual(-1e-5)
        expect(caixa.max.x).toBeLessThanOrEqual(16.00001)
        expect(caixa.min.z).toBeGreaterThanOrEqual(-1e-5)
        expect(caixa.max.z).toBeLessThanOrEqual(16.00001)
        expect(p.geometria.getAttribute('position').count).toBeLessThanOrEqual(65000)
      }
      expect(fontes.map((f) => f.geometria.getAttribute('position').array)).toEqual(antes)
    } finally {
      for (const p of saida) p.geometria.dispose()
      t.descartar()
    }
  })

test('triângulo que cruza setores é recusado em vez de alterar silenciosamente o relevo', () => {
  const t = exemplo(),
    g = new BufferGeometry().setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 32, 0, 0, 0, 0, 32]), 3),
    ),
    m = new Matrix4().makeTranslation(t.base.origem.x, 0, t.base.origem.z)
  try {
    expect(() => particionarTerrenoCompilado({ geometria: g, matriz: m }, t.base)).toThrow(
      /atravessa setores/,
    )
  } finally {
    g.dispose()
    t.descartar()
  }
})

import {
  type FormaDeCenario,
  malhaDaForma,
  volumeDaForma,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { ModeloCarregado } from './modelos'

export function chaveDaForma(f: FormaDeCenario) {
  return `forma:${JSON.stringify(f.tipo === 'cilindro' ? [f.tipo, f.raio, f.altura, f.lados] : [f.tipo, f.largura, f.altura, f.comprimento, f.tipo === 'escada' ? f.degraus : null])}`
}

/** Usa a mesma superfície determinística do núcleo que alimentará os exportadores. */
export function criarModeloDaForma(f: FormaDeCenario): ModeloCarregado {
  const dados = malhaDaForma(f),
    g = new BufferGeometry(),
    m = new MeshStandardMaterial({ color: 0xc8d1df, roughness: 0.85 })
  g.setAttribute('position', new BufferAttribute(dados.posicoes, 3))
  g.setAttribute('normal', new BufferAttribute(dados.normais, 3))
  g.setAttribute('uv', new BufferAttribute(dados.uvs, 2))
  g.setIndex(new BufferAttribute(dados.indices, 1))
  g.computeBoundingBox()
  g.computeBoundingSphere()
  const v = volumeDaForma(f),
    caixa = new Box3(new Vector3(v.min.x, v.min.y, v.min.z), new Vector3(v.max.x, v.max.y, v.max.z))
  const raiz = new Group()
  raiz.add(new Mesh(g, m))
  let descartado = false
  return {
    partes: [{ geometria: g, material: m, matriz: new Matrix4() }],
    caixa,
    raiz,
    triangulos: dados.indices.length / 3,
    descartar() {
      if (!descartado) {
        descartado = true
        g.dispose()
        m.dispose()
      }
    },
  }
}

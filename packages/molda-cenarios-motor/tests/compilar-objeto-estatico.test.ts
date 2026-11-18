import { expect, test } from 'bun:test'
import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  AnimationClip,
  Box3,
  Color,
  DataTexture,
  type Mesh,
  type MeshStandardMaterial,
  RGBAFormat,
  Vector3,
} from 'three'
import { prepararObjetoEstatico } from '../src/compilar/objeto-estatico'
import { criarModeloDaForma } from '../src/formas'

const objeto = (): InstanciaDeCenario => ({
  id: 'o',
  nome: 'Caixa',
  modelo: 'f',
  grupo: null,
  oculto: false,
  bloqueado: false,
  colisao: 'caixa',
  apoio: { tipo: 'absoluto' },
  transformacao: {
    posicao: { x: 200, y: 10, z: -30 },
    rotacao: { x: 0, y: 0.7, z: 0 },
    escala: { x: 2, y: 1, z: 3 },
  },
})
const modelo = () =>
  criarModeloDaForma({
    id: 'f',
    nome: 'Caixa',
    tipo: 'caixa',
    largura: 2,
    altura: 1,
    comprimento: 3,
  })
test('template mantém coordenadas locais e tonalidade, sem alterar material/transformação originais', () => {
  const m = modelo(),
    o = objeto()
  o.aparencia = { cor: '#ff8060' }
  const antes = JSON.stringify(o),
    cor = (m.partes[0]!.material as MeshStandardMaterial).color.clone(),
    r = prepararObjetoEstatico(o, m)
  try {
    const tamanho = new Box3().setFromObject(r.raiz).getSize(new Vector3()),
      material = (r.raiz.children[0] as Mesh).material as MeshStandardMaterial
    expect([...tamanho]).toEqual([2, 1, 3])
    expect(material.color.toArray()).toEqual(cor.clone().multiply(new Color('#ff8060')).toArray())
    expect((m.partes[0]!.material as MeshStandardMaterial).color.toArray()).toEqual(cor.toArray())
    expect(JSON.stringify(o)).toBe(antes)
  } finally {
    r.descartar()
    r.descartar()
    m.descartar()
  }
})
test('espelho conserva faces e UV métrico incorpora a escala sem assar a transformação do mundo', () => {
  const m = modelo(),
    o = objeto(),
    t = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat)
  o.espelho = { x: true, y: false, z: false }
  o.aparencia = { textura: { id: 't', repeticaoMetros: 0.5 } }
  const r = prepararObjetoEstatico(o, m, t)
  try {
    let comparados = 0,
      erro = 0
    for (const filho of r.raiz.children) {
      const mesh = filho as Mesh,
        g = mesh.geometry,
        p = g.getAttribute('position'),
        n = g.getAttribute('normal'),
        uv = g.getAttribute('uv')
      expect((mesh.material as MeshStandardMaterial).map).toBe(t)
      expect(g.getAttribute('normalDaFace')).toBeUndefined()
      for (let i = 0; i < p.count; i++)
        if (n.getY(i) > 0.99) {
          erro = Math.max(
            erro,
            Math.abs(uv.getX(i) + p.getX(i) * 4),
            Math.abs(uv.getY(i) - p.getZ(i) * 6),
          )
          comparados++
        }
      for (let i = 0; i < g.index!.count; i += 3) {
        const a = g.index!.getX(i),
          b = g.index!.getX(i + 1),
          c = g.index!.getX(i + 2),
          origem = new Vector3().fromBufferAttribute(p, a),
          normal = new Vector3().crossVectors(
            new Vector3().fromBufferAttribute(p, b).sub(origem),
            new Vector3().fromBufferAttribute(p, c).sub(origem),
          )
        expect(normal.dot(new Vector3().fromBufferAttribute(n, a))).toBeGreaterThan(0)
      }
    }
    expect(comparados).toBeGreaterThan(0)
    expect(erro).toBeLessThan(1e-6)
    expect(new Box3().setFromObject(r.raiz).getSize(new Vector3()).x).toBe(2)
  } finally {
    r.descartar()
    m.descartar()
    t.dispose()
  }
})
test('acabamento pendente não é substituído silenciosamente por material de reserva', () => {
  const m = modelo(),
    o = objeto()
  o.aparencia = { textura: { id: 't', repeticaoMetros: 1 } }
  try {
    expect(() => prepararObjetoEstatico(o, m)).toThrow(/textura/)
  } finally {
    m.descartar()
  }
})

test('modelo com clipe não pode ser assado pelo caminho estático', () => {
  const m = modelo()
  m.animacoes = [new AnimationClip('Controle', 1, [])]
  try {
    expect(() => prepararObjetoEstatico(objeto(), m)).toThrow(/animável|clipe/)
  } finally {
    m.descartar()
  }
})

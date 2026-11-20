import { BufferAttribute, BufferGeometry, Matrix3, type Matrix4, Vector3 } from 'three'

/** Acima disto (cosseno com o "para cima" do mundo), o triângulo sustenta quem pisa. */
const VOLTADO_PARA_CIMA = 0.5

/**
 * A superfície física de um piso feito de peças (lajes, ladrilhos): só os triângulos virados
 * para cima, no mesmo lugar do desenho. As laterais, os fundos e os chanfros de cada peça não
 * sustentam ninguém e eram a maior parte da malha (a praça de lajes da Faísca: 66 mil
 * triângulos), o que estourava a colisão local do jogo. O topo continua exato, então os pés
 * assentam nas lajes como antes. Pontes e estruturas não passam por aqui: as laterais delas
 * seguram o corpo. Quem chama é dono da geometria nova e a descarta.
 */
export function topoFisicoDoPiso(geometria: BufferGeometry, matriz: Matrix4): BufferGeometry {
  const posicao = geometria.getAttribute('position'),
    indice = geometria.getIndex(),
    normal = new Matrix3().getNormalMatrix(matriz),
    a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    ab = new Vector3(),
    ac = new Vector3(),
    saida: number[] = []
  const triangulos = (indice ? indice.count : posicao.count) / 3
  for (let t = 0; t < triangulos; t++) {
    const ia = indice ? indice.getX(t * 3) : t * 3,
      ib = indice ? indice.getX(t * 3 + 1) : t * 3 + 1,
      ic = indice ? indice.getX(t * 3 + 2) : t * 3 + 2
    a.fromBufferAttribute(posicao, ia)
    b.fromBufferAttribute(posicao, ib)
    c.fromBufferAttribute(posicao, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    const n = ab.cross(ac).applyMatrix3(normal),
      tamanho = n.length()
    if (tamanho < 1e-12 || n.y / tamanho < VOLTADO_PARA_CIMA) continue
    saida.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  }
  return new BufferGeometry().setAttribute(
    'position',
    new BufferAttribute(Float32Array.from(saida), 3),
  )
}

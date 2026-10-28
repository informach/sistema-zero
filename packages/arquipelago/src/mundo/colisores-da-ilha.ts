import { type BufferGeometry, Matrix4, type Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import { BORDA_DOS_COLISORES } from './medidas'

/**
 * Os colisores das ilhas completas saem dos nós `col-*` do GLB, feitos à mão no Blender ao lado de
 * cada peça (README de `arte/ilhas`). A malha de desenho nunca vira colisão: ela é pesada, cheia de
 * enfeite em que o personagem tropeçaria, e muda sempre que a arte muda.
 *
 * - `col-terreno`: malha de triângulos (o chão com a praia e o barranco);
 * - `col-cil-*`: cilindro em pé no eixo do nó (raio pela escala no chão, altura pela escala em y);
 * - qualquer outro `col-*`: caixa do tamanho do nó.
 *
 * As posições saem no espaço da raiz (com o giro da ilha já posto nela), prontas para um
 * `RigidBody` no centro da ilha.
 */
export const PREFIXO_DE_COLISAO = 'col-'
const PREFIXO_DE_CILINDRO = 'col-cil-'
const PREFIXO_DE_MALHA = 'col-terreno'

type Tripla = [number, number, number]
type Quadra = [number, number, number, number]

export type ColisorDaIlha =
  | { forma: 'caixa'; nome: string; posicao: Tripla; rotacao: Quadra; meio: Tripla }
  | {
      forma: 'cilindro'
      nome: string
      posicao: Tripla
      rotacao: Quadra
      raio: number
      meiaAltura: number
    }
  | { forma: 'malha'; nome: string; vertices: Float32Array; indices: Uint32Array }

/**
 * Colisores que só seguram o corpo: a câmera passa por eles, senão ela pularia para perto por nada
 * que se vê (o guarda-corpo dos deques e as paredes sob os corrimãos de corda), por folhagem macia
 * (moitas, a saia do pinheiro, cogumelos), por peça fina e baixa (postes, estacas, colunas,
 * floreiras, vasos, canteiros, o barquinho e as pernas do escorregador) ou por quem mora na ilha
 * (a Capi). Paredes, troncos, pedras, torre e cabana continuam tapando a câmera.
 */
const SO_PARA_O_CORPO = [
  'col-guarda-',
  'col-ponte-lado-',
  'col-cil-moita-',
  'col-cil-copa-',
  'col-cil-cogumelo-',
  'col-cil-poste-',
  'col-cil-estaca-',
  'col-cil-perna-',
  'col-cil-vaso-',
  'col-coluna-',
  'col-floreira-',
  'col-canteiro-',
  'col-barco-',
  'col-quadro-',
  'col-morador-',
  'col-escada-reta-',
  // A parede da obra cortada (modo construção): baixa na tela, a câmera vê dentro de casa.
  'col-obra-cortada-',
  // A cerca do quintal: fina e baixa.
  'col-cerca-',
  // Os objetos da casa (geladeira, casinha): a câmera vê por cima deles.
  'col-objeto-',
]

export function soParaOCorpo(nome: string): boolean {
  return SO_PARA_O_CORPO.some((p) => nome.startsWith(p))
}

export function ehNoDeColisao(o: Object3D): boolean {
  return o.name.startsWith(PREFIXO_DE_COLISAO)
}

const posicao = new Vector3()
const rotacao = new Quaternion()
const escala = new Vector3()
const centro = new Vector3()
const tamanho = new Vector3()
const ponto = new Vector3()
const relativa = new Matrix4()

function caixaDaGeometria(g: BufferGeometry) {
  if (!g.boundingBox) g.computeBoundingBox()
  // Sem posições a caixa sai vazia (infinita): conta como um ponto na origem.
  const caixa = g.boundingBox
  if (!caixa || caixa.isEmpty())
    return { centro: centro.set(0, 0, 0), tamanho: tamanho.set(0, 0, 0) }
  return { centro: caixa.getCenter(centro), tamanho: caixa.getSize(tamanho) }
}

function malhaDoNo(m: Mesh, matriz: Matrix4, nome: string): ColisorDaIlha {
  const p = m.geometry.attributes.position
  const vertices = new Float32Array((p?.count ?? 0) * 3)
  for (let i = 0; i < (p?.count ?? 0); i++) {
    if (!p) break
    ponto.fromBufferAttribute(p, i).applyMatrix4(matriz)
    vertices.set([ponto.x, ponto.y, ponto.z], i * 3)
  }
  const indice = m.geometry.index
  const indices = indice
    ? Uint32Array.from({ length: indice.count }, (_, i) => indice.getX(i))
    : Uint32Array.from({ length: p?.count ?? 0 }, (_, i) => i)
  return { forma: 'malha', nome, vertices, indices }
}

/** Lê os nós `col-*` de uma ilha (a raiz já com o giro dela). Não mexe na cena. */
export function lerColisores(raiz: Object3D): ColisorDaIlha[] {
  raiz.updateMatrixWorld(true)
  // O espaço da raiz SEM a posição/escala de onde ela estiver pendurada, mas COM o giro dela.
  const daRaiz = new Matrix4().compose(new Vector3(), raiz.quaternion, new Vector3(1, 1, 1))
  const paraRaiz = raiz.matrixWorld.clone().invert().premultiply(daRaiz)
  const lista: ColisorDaIlha[] = []
  raiz.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !ehNoDeColisao(m)) return
    relativa.multiplyMatrices(paraRaiz, m.matrixWorld)
    if (m.name.startsWith(PREFIXO_DE_MALHA)) {
      lista.push(malhaDoNo(m, relativa, m.name))
      return
    }
    relativa.decompose(posicao, rotacao, escala)
    const geo = caixaDaGeometria(m.geometry)
    // O meio da forma (a forma unitária tem o meio na origem, mas uma malha torta também serve).
    const meio = ponto.copy(geo.centro).applyMatrix4(relativa)
    const lados: Tripla = [
      Math.abs(geo.tamanho.x * escala.x),
      Math.abs(geo.tamanho.y * escala.y),
      Math.abs(geo.tamanho.z * escala.z),
    ]
    const base = {
      nome: m.name,
      posicao: [meio.x, meio.y, meio.z] as Tripla,
      rotacao: [rotacao.x, rotacao.y, rotacao.z, rotacao.w] as Quadra,
    }
    if (m.name.startsWith(PREFIXO_DE_CILINDRO)) {
      lista.push({
        ...base,
        forma: 'cilindro',
        raio: Math.max(lados[0], lados[2]) / 2,
        meiaAltura: lados[1] / 2,
      })
    } else {
      lista.push({ ...base, forma: 'caixa', meio: [lados[0] / 2, lados[1] / 2, lados[2] / 2] })
    }
  })
  return lista
}

/** Tira os nós `col-*` da cena (eles não desenham) e solta a geometria deles. */
export function tirarNosDeColisao(raiz: Object3D): number {
  const nos: Mesh[] = []
  raiz.traverse((o) => {
    if (ehNoDeColisao(o)) nos.push(o as Mesh)
  })
  const geometrias = new Set<BufferGeometry>()
  for (const no of nos) {
    if (no.geometry) geometrias.add(no.geometry)
    no.removeFromParent()
  }
  for (const g of geometrias) g.dispose()
  return nos.length
}

/**
 * A borda arredondada que cabe na forma: no máximo `BORDA_DOS_COLISORES`, e menos da metade do lado
 * mais fino (uma tábua de 7 cm não pode ter borda de 3 cm de cada lado e sumir).
 */
export function bordaQueCabe(...meios: number[]): number {
  return Math.max(0, Math.min(BORDA_DOS_COLISORES, Math.min(...meios) * 0.5))
}

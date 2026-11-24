import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  type Mesh,
  Vector3,
} from 'three'
import { uvDaSuperficie } from '../projecao-textura'

/** A pose inicial define somente os UVs. Mantém posições-base, juntas, pesos,
 * morphs e faces que uma pose possa colapsar temporariamente. */
export function projetarTexturaAnimavel(
  malha: Mesh,
  reflexo: Matrix4,
  escala: Vector3,
  metros: number,
): BufferGeometry {
  const fonte = malha.geometry,
    pos = fonte.getAttribute('position'),
    n = fonte.index?.count ?? pos?.count ?? 0,
    atributos = [
      ...Object.values(fonte.attributes),
      ...Object.values(fonte.morphAttributes).flat(),
    ],
    componentes = atributos.reduce((s, a) => s + (a?.itemSize ?? 0), 2)
  if (
    pos?.itemSize !== 3 ||
    !n ||
    n % 3 ||
    n > LIMITES_DA_EXPORTACAO.malha.verticesDaFonte ||
    n * componentes * 4 > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte ||
    atributos.some((a) => !a || a.count !== pos.count)
  )
    throw Error('A projeção animável excede o orçamento ou possui um layout inválido.')
  for (let i = 0; i < n; i++) {
    const id = fonte.index?.getX(i) ?? i
    if (!Number.isSafeInteger(id) || id < 0 || id >= pos.count)
      throw Error('Um índice da projeção animável é inválido.')
  }
  const g = fonte.index ? fonte.toNonIndexed() : fonte.clone()
  try {
    const matriz = new Matrix4().multiplyMatrices(reflexo, malha.matrixWorld),
      normalMatrix = new Matrix3().getNormalMatrix(matriz),
      inversa = matriz.determinant() < 0,
      uvs = new Float32Array(n * 2),
      a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      normal = new Vector3(),
      ab = new Vector3(),
      ac = new Vector3(),
      ids = [0, 0, 0]
    for (let i = 0; i < n; i += 3) {
      for (let j = 0; j < 3; j++) ids[j] = fonte.index?.getX(i + j) ?? i + j
      malha.getVertexPosition(ids[0]!, a).applyMatrix4(matriz)
      malha.getVertexPosition(ids[1]!, b).applyMatrix4(matriz)
      malha.getVertexPosition(ids[2]!, c).applyMatrix4(matriz)
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
      if (normal.lengthSq() === 0) {
        // Conserva a face para os demais quadros. Orientação de repouso primeiro;
        // uma face degenerada também no repouso usa sua normal autoral ou o eixo Y.
        const pontos = [a.clone(), b.clone(), c.clone()]
        a.fromBufferAttribute(pos, ids[0]!).applyMatrix4(matriz)
        b.fromBufferAttribute(pos, ids[1]!).applyMatrix4(matriz)
        c.fromBufferAttribute(pos, ids[2]!).applyMatrix4(matriz)
        normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
        a.copy(pontos[0]!)
        b.copy(pontos[1]!)
        c.copy(pontos[2]!)
        if (normal.lengthSq() === 0) {
          const autoral = fonte.getAttribute('normal')
          if (autoral) normal.fromBufferAttribute(autoral, ids[0]!).applyMatrix3(normalMatrix)
          if (normal.lengthSq() === 0) normal.set(0, 1, 0)
          if (inversa) normal.negate()
        }
      }
      if (inversa) normal.negate()
      normal.normalize()
      for (const [j, p] of [a, b, c].entries())
        uvs.set(uvDaSuperficie(p, normal, escala, metros), (i + j) * 2)
    }
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    g.deleteAttribute('color')
    g.deleteAttribute('tangent')
    g.setDrawRange(fonte.drawRange.start, fonte.drawRange.count)
    return g
  } catch (erro) {
    g.dispose()
    throw erro
  }
}

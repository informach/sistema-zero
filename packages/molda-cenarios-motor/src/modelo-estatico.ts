import {
  type BufferAttribute,
  type BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  type Mesh,
  type SkinnedMesh,
  Vector3,
  Vector4,
} from 'three'

/** Geometria da pose inicial para instâncias estáticas. O GLB e a raiz animável não mudam. */
export function geometriaDaPoseInicial(malha: Mesh): BufferGeometry {
  const original = malha.geometry
  const pele = (malha as SkinnedMesh).isSkinnedMesh ? (malha as SkinnedMesh) : null
  if (!pele && !Object.values(original.morphAttributes).some((a) => a.length)) return original
  const g = original.clone()
  try {
    const pesos = malha.morphTargetInfluences ?? []
    const deformada = pele !== null || pesos.some((p) => p !== 0)
    if (deformada) {
      const novoAtributo = (nome: string) => {
        const fonte = original.getAttribute(nome)
        if (!fonte) return undefined
        const atributo = new Float32BufferAttribute(
          new Float32Array(fonte.count * fonte.itemSize),
          fonte.itemSize,
        )
        g.setAttribute(nome, atributo)
        return atributo
      }
      // A pose pode sair do intervalo de um atributo inteiro normalizado do GLB.
      // Ela é materializada em Float32, sem saturar ou envolver os valores quantizados.
      const posicao = novoAtributo('position')!
      const normal = novoAtributo('normal')
      const cor = novoAtributo('color')
      const indices = new Vector4(),
        influencias = new Vector4(),
        matriz = new Matrix4(),
        osso = new Matrix4(),
        matrizNormal = new Matrix3(),
        v = new Vector3()
      const deformarAtributo = (atributo: BufferAttribute, nome: 'normal' | 'color', i: number) => {
        const alvo = original.morphAttributes[nome] ?? []
        for (let eixo = 0; eixo < atributo.itemSize; eixo++) {
          const inicial = original.getAttribute(nome).getComponent(i, eixo)
          let valor = inicial
          for (let j = 0; j < alvo.length; j++) {
            const peso = pesos[j] ?? 0
            if (peso)
              valor +=
                peso *
                (alvo[j]!.getComponent(i, eixo) - (original.morphTargetsRelative ? 0 : inicial))
          }
          atributo.setComponent(i, eixo, valor)
        }
      }
      for (let i = 0; i < posicao.count; i++) {
        malha.getVertexPosition(i, v)
        posicao.setXYZ(i, v.x, v.y, v.z)
        if (normal) {
          deformarAtributo(normal, 'normal', i)
          v.fromBufferAttribute(normal, i)
          if (pele) {
            const ids = original.getAttribute('skinIndex'),
              pesos = original.getAttribute('skinWeight')
            indices.set(ids.getX(i), ids.getY(i), ids.getZ(i), ids.getW(i))
            influencias.set(pesos.getX(i), pesos.getY(i), pesos.getZ(i), pesos.getW(i))
            matriz.elements.fill(0)
            for (let j = 0; j < 4; j++) {
              const peso = influencias.getComponent(j)
              if (!peso) continue
              const k = indices.getComponent(j)
              osso.multiplyMatrices(
                pele.skeleton.bones[k]!.matrixWorld,
                pele.skeleton.boneInverses[k]!,
              )
              for (let e = 0; e < 16; e++)
                matriz.elements[e] = matriz.elements[e]! + peso * osso.elements[e]!
            }
            matriz.premultiply(pele.bindMatrixInverse).multiply(pele.bindMatrix)
            // Mesmo produto do shader skinnormal: direção (w=0), sem translação dos ossos.
            v.applyMatrix3(matrizNormal.setFromMatrix4(matriz))
          }
          v.normalize()
          normal.setXYZ(i, v.x, v.y, v.z)
        }
        if (cor) deformarAtributo(cor, 'color', i)
      }
      if (g.getAttribute('tangent')) {
        if (g.index && normal && g.getAttribute('uv')) g.computeTangents()
        else g.deleteAttribute('tangent')
      }
    }
    g.morphAttributes = {}
    g.deleteAttribute('skinIndex')
    g.deleteAttribute('skinWeight')
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  } catch (e) {
    g.dispose()
    throw e
  }
}

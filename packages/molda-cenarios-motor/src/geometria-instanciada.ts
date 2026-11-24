import { type BufferGeometry, Float32BufferAttribute, type Matrix4 } from 'three'

/** Materializa a transformação sem matrizes de instância negativas nem perda de atributos. */
export function transformarGeometriaEstatica(
  original: BufferGeometry,
  matriz: Matrix4,
): BufferGeometry {
  if (!matriz.elements.every(Number.isFinite))
    throw new Error('A transformação do modelo é inválida')
  const g = original.clone()
  try {
    // Decodifica inclusive atributos normalizados/intercalados. Cada atributo ganha seu buffer:
    // UVs que compartilham um accessor não podem ser trocadas duas vezes ao inverter uma face.
    for (const [nome, a] of Object.entries(original.attributes)) {
      const valores = Float32Array.from({ length: a.count * a.itemSize }, (_, i) =>
        a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize),
      )
      g.setAttribute(nome, new Float32BufferAttribute(valores, a.itemSize))
    }
    g.applyMatrix4(matriz)
    if (matriz.determinant() < 0) {
      if (g.index) {
        for (let i = 0; i < g.index.count; i += 3) {
          const b = g.index.getX(i + 1)
          g.index.setX(i + 1, g.index.getX(i + 2))
          g.index.setX(i + 2, b)
        }
      } else {
        for (const a of Object.values(g.attributes))
          for (let i = 0; i < a.count; i += 3)
            for (let c = 0; c < a.itemSize; c++) {
              const b = a.getComponent(i + 1, c)
              a.setComponent(i + 1, c, a.getComponent(i + 2, c))
              a.setComponent(i + 2, c, b)
            }
      }
      const tangente = g.getAttribute('tangent')
      if (tangente) for (let i = 0; i < tangente.count; i++) tangente.setW(i, -tangente.getW(i))
    }
    const posicoes = g.getAttribute('position')
    if (!posicoes) throw new Error('O modelo não possui posições')
    for (let i = 0; i < posicoes.count; i++)
      if (![posicoes.getX(i), posicoes.getY(i), posicoes.getZ(i)].every(Number.isFinite))
        throw new Error('O modelo possui posições inválidas')
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  } catch (e) {
    g.dispose()
    throw e
  }
}

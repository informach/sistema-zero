import { type PlanoDeRecorte, recortarAtributos } from '@sistemazero/molda-cenarios-core/geometria'
import { BufferGeometry, Float32BufferAttribute } from 'three'

export { contornoConvexo, type PlanoDeRecorte } from '@sistemazero/molda-cenarios-core/geometria'

/** Adaptador de buffers: o cálculo do recorte pertence ao núcleo puro compartilhado. */
export function recortarMalha(
  original: BufferGeometry,
  planos: readonly PlanoDeRecorte[],
  excluir: readonly (readonly { x: number; z: number }[])[] = [],
): BufferGeometry {
  const atributos = Object.fromEntries(
    Object.entries(original.attributes).map(([nome, a]) => [
      nome,
      {
        itemSize: a.itemSize,
        valores: Float32Array.from({ length: a.count * a.itemSize }, (_, i) =>
          a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize),
        ),
      },
    ]),
  )
  const dados = recortarAtributos(
    { atributos, ...(original.index ? { indices: original.index.array } : {}) },
    planos,
    excluir,
  )
  const geometria = new BufferGeometry()
  for (const [nome, a] of Object.entries(dados))
    geometria.setAttribute(nome, new Float32BufferAttribute(a.valores, a.itemSize))
  return geometria
}

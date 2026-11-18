import {
  BatchedMesh,
  BufferAttribute,
  BufferGeometry,
  Group,
  type Material,
  Matrix4,
  Mesh,
} from 'three'
import type { PartePreparadaDeCaminho } from './estruturas'
import { lerParteEstatica } from './parte-estatica'

/** Uma chamada por material/layout, mesmo quando os módulos acompanham relevos diferentes. */
export function agruparPecas(
  pecas: (PartePreparadaDeCaminho & { material: Material })[],
  ordem: number,
  sombra: boolean,
) {
  const raiz = new Group(),
    lotes: BatchedMesh[] = [],
    compactadas: BufferGeometry[] = [],
    atualizacoes: (() => void)[] = [],
    grupos = new Map<Material, Map<string, typeof pecas>>()
  try {
    for (const p of pecas) {
      const materiais = grupos.get(p.material) ?? new Map<string, typeof pecas>(),
        chave = JSON.stringify([
          Boolean(p.geometria.index),
          Object.entries(p.geometria.attributes)
            .map(([n, a]) => [n, a.itemSize, a.normalized])
            .sort(),
          p.geometria.drawRange,
        ]),
        lista = materiais.get(chave) ?? []
      lista.push(p)
      materiais.set(chave, lista)
      grupos.set(p.material, materiais)
    }
    for (const [material, layouts] of grupos)
      for (const lista of layouts.values()) {
        if (lista.length === 1) {
          const p = lista[0]!,
            malha = new Mesh(p.geometria, material)
          malha.matrixAutoUpdate = false
          malha.matrix.copy(p.matriz)
          malha.receiveShadow = true
          malha.castShadow = sombra
          malha.renderOrder = ordem + 1
          raiz.add(malha)
        } else {
          const unicas = [...new Set(lista.map((p) => p.geometria))],
            preparadas = new Map(
              unicas.map((g) => {
                if (
                  g.drawRange.start === 0 &&
                  (g.drawRange.count === Infinity ||
                    g.drawRange.count === (g.index?.count ?? g.getAttribute('position').count))
                )
                  return [g, g] as const
                const leitura = lerParteEstatica(
                    { geometria: g, matriz: new Matrix4() },
                    new Matrix4(),
                  ),
                  copia = new BufferGeometry()
                compactadas.push(copia)
                try {
                  for (const [nome, a] of Object.entries(leitura.malha.atributos)) {
                    const valores = new Float32Array(leitura.malha.indices!.length * a.itemSize)
                    for (let i = 0; i < leitura.malha.indices!.length; i++)
                      for (let j = 0; j < a.itemSize; j++)
                        valores[i * a.itemSize + j] =
                          a.valores[leitura.malha.indices![i]! * a.itemSize + j]!
                    copia.setAttribute(nome, new BufferAttribute(valores, a.itemSize))
                  }
                  return [g, copia] as const
                } finally {
                  leitura.descartar()
                }
              }),
            ),
            vertices = [...preparadas.values()].reduce(
              (s, g) => s + g.getAttribute('position').count,
              0,
            ),
            indices = [...preparadas.values()].reduce((s, g) => s + (g.index?.count ?? 0), 0),
            lote = new BatchedMesh(lista.length, vertices, indices, material),
            ids = new Map<BufferGeometry, number>()
          lotes.push(lote)
          // BatchedMesh copia o buffer inteiro e ignora drawRange: grupos GLB precisam ser
          // compactados primeiro. Não promover faces de outros materiais a este lote.
          for (const g of unicas) ids.set(g, lote.addGeometry(preparadas.get(g)!))
          for (const p of lista) lote.setMatrixAt(lote.addInstance(ids.get(p.geometria)!), p.matriz)
          lote.receiveShadow = true
          lote.castShadow = sombra
          lote.renderOrder = ordem + 1
          raiz.add(lote)
          if (lista.some((p) => p.conformada))
            atualizacoes.push(() => {
              for (const g of unicas) lote.setGeometryAt(ids.get(g)!, g)
              lote.computeBoundingBox()
              lote.computeBoundingSphere()
            })
        }
      }
    return {
      raiz,
      atualizar: () => {
        for (const f of atualizacoes) f()
      },
      descartar: () => {
        for (const l of lotes) l.dispose()
        for (const g of compactadas) g.dispose()
        raiz.clear()
      },
    }
  } catch (erro) {
    for (const l of lotes) l.dispose()
    for (const g of compactadas) g.dispose()
    throw erro
  }
}
